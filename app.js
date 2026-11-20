'use strict';

const APP_VERSION = '0.2.0';
const DB_NAME = 'sumarium-mobile-db';
const DB_VERSION = 1;
const CASE_STORE = 'cases';
const EVENT_STORE = 'events';
const LEGACY_KEY = 'sumarium-mobile-library-v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let db;
let cases = [];
let currentFilter = 'all';
let currentView = 'home';
let selectedCaseId = null;
let toastTimer;
let installPrompt = null;

function uid() {
  return globalThis.crypto?.randomUUID?.() || `sm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function normalizeText(value = '') { return String(value).trim().replace(/\s+/g, ' '); }
function normalizeCase(raw = {}) {
  const now = Date.now();
  const title = normalizeText(raw.title ?? raw.carátula ?? raw.caratula ?? raw.caseTitle ?? raw.name ?? '');
  return {
    id: String(raw.id || uid()),
    title,
    number: normalizeText(raw.number ?? raw.numero ?? ''),
    year: normalizeText(raw.year ?? raw.anio ?? raw.año ?? ''),
    court: normalizeText(raw.court ?? raw.juzgado ?? raw.circunscripcion ?? raw.circunscripción ?? ''),
    jurisdiction: normalizeText(raw.jurisdiction ?? raw.fuero ?? ''),
    status: normalizeText(raw.status ?? raw.estado ?? 'Activo') || 'Activo',
    url: normalizeText(raw.url ?? raw.caseUrl ?? raw.casePath ?? ''),
    nextDate: normalizeText(raw.nextDate ?? raw.proximaFecha ?? ''),
    notes: String(raw.notes ?? raw.notas ?? '').trim(),
    watch: Boolean(raw.watch ?? raw.watched ?? raw.following),
    createdAt: Number(raw.createdAt ?? raw.created ?? now) || now,
    updatedAt: Number(raw.updatedAt ?? raw.lastUpdated ?? now) || now,
    lastMovement: normalizeText(raw.lastMovement ?? raw.movementDate ?? ''),
    source: normalizeText(raw.source ?? 'manual') || 'manual'
  };
}
function validUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
function dbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Error de almacenamiento'));
  });
}
function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('No se pudo guardar la operación'));
  });
}
async function openDatabase() {
  if (!('indexedDB' in window)) throw new Error('Este navegador no permite almacenamiento IndexedDB.');
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(CASE_STORE)) {
      const store = database.createObjectStore(CASE_STORE, { keyPath: 'id' });
      store.createIndex('title', 'title', { unique: false });
      store.createIndex('watch', 'watch', { unique: false });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });
    }
    if (!database.objectStoreNames.contains(EVENT_STORE)) database.createObjectStore(EVENT_STORE, { keyPath: 'id' });
  };
  return dbRequest(request);
}
async function getAllCases() {
  const tx = db.transaction(CASE_STORE, 'readonly');
  const result = await dbRequest(tx.objectStore(CASE_STORE).getAll());
  await txDone(tx);
  return result.map(normalizeCase).sort((a,b) => b.updatedAt - a.updatedAt);
}
async function saveCase(record) {
  const tx = db.transaction(CASE_STORE, 'readwrite');
  tx.objectStore(CASE_STORE).put(record);
  await txDone(tx);
}
async function deleteCase(id) {
  const tx = db.transaction([CASE_STORE, EVENT_STORE], 'readwrite');
  tx.objectStore(CASE_STORE).delete(id);
  const events = tx.objectStore(EVENT_STORE);
  const all = await dbRequest(events.getAll());
  all.filter(x => x.caseId === id).forEach(x => events.delete(x.id));
  await txDone(tx);
}
async function saveEvent(action, record, detail = '') {
  const tx = db.transaction(EVENT_STORE, 'readwrite');
  tx.objectStore(EVENT_STORE).put({ id: uid(), action, caseId: record?.id || '', title: record?.title || '', detail, at: Date.now() });
  await txDone(tx);
}
async function migrateLegacyData() {
  if (localStorage.getItem(`${LEGACY_KEY}:migrated`)) return 0;
  let old = [];
  try { old = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]'); } catch { old = []; }
  if (!Array.isArray(old) || old.length === 0) {
    localStorage.setItem(`${LEGACY_KEY}:migrated`, '1');
    return 0;
  }
  const tx = db.transaction(CASE_STORE, 'readwrite');
  const store = tx.objectStore(CASE_STORE);
  const existing = await dbRequest(store.getAll());
  const keys = new Set(existing.map(x => x.id));
  let migrated = 0;
  for (const item of old) {
    const record = normalizeCase(item);
    if (!record.title || keys.has(record.id)) continue;
    store.put(record); keys.add(record.id); migrated++;
  }
  await txDone(tx);
  localStorage.setItem(`${LEGACY_KEY}:migrated`, '1');
  return migrated;
}
async function refresh() {
  cases = await getAllCases();
  renderAll();
}
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2800);
}
function fmtDate(value) {
  if (!value) return '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PY', {day:'2-digit', month:'2-digit', year:'numeric'}).format(date);
}
function isRecent(record) {
  const time = Number(record.updatedAt || record.createdAt || 0);
  return time > 0 && Date.now() - time <= 7 * 86400000;
}
function cardMarkup(record) {
  const meta = [record.number ? `N.º ${record.number}` : '', record.year, record.court, record.jurisdiction].filter(Boolean).join(' · ');
  const tags = `<span class="tag">${escapeHtml(record.status || 'Sin verificar')}</span>${record.watch ? '<span class="tag watch">EN SEGUIMIENTO</span>' : ''}${record.nextDate ? `<span class="tag due">Próxima fecha: ${escapeHtml(fmtDate(record.nextDate))}</span>` : ''}`;
  return `<article class="case-card" data-card="${escapeHtml(record.id)}"><div class="case-icon" aria-hidden="true">▤</div><div class="case-content"><h3>${escapeHtml(record.title)}</h3><div class="case-meta">${escapeHtml(meta || 'Sin datos adicionales')}</div><div class="case-tags">${tags}</div><div class="card-actions"><button class="small-btn primary-soft" data-detail="${escapeHtml(record.id)}">Ver ficha</button><button class="small-btn" data-watch="${escapeHtml(record.id)}">${record.watch ? 'Quitar seguimiento' : '＋ Seguir'}</button></div></div></article>`;
}
function renderStats() {
  $('#statCases').textContent = cases.length;
  $('#statWatched').textContent = cases.filter(x => x.watch).length;
  $('#statRecent').textContent = cases.filter(isRecent).length;
  $('#allCount').textContent = cases.length;
  $('#watchFilterCount').textContent = cases.filter(x => x.watch).length;
  $('#followingTotal').textContent = cases.filter(x => x.watch).length;
  $('#storageLabel').textContent = `${cases.length} expediente(s) guardado(s) localmente`;
}
function renderHome() {
  const recent = [...cases].sort((a,b) => b.updatedAt - a.updatedAt).slice(0,4);
  $('#homeRecent').innerHTML = recent.map(cardMarkup).join('');
  $('#homeEmpty').hidden = cases.length !== 0;
}
function getLibraryResults() {
  const query = normalizeText($('#searchInput').value).toLocaleLowerCase('es');
  return cases.filter(record => {
    const haystack = [record.title, record.number, record.year, record.court, record.jurisdiction, record.status, record.notes].join(' ').toLocaleLowerCase('es');
    const matchesText = !query || haystack.includes(query);
    const matchesFilter = currentFilter === 'all' || (currentFilter === 'watch' && record.watch) || (currentFilter === 'recent' && isRecent(record));
    return matchesText && matchesFilter;
  });
}
function renderLibrary() {
  const results = getLibraryResults();
  $('#librarySubtitle').textContent = `${cases.length} expediente(s) en esta biblioteca.`;
  $('#libraryList').innerHTML = results.map(cardMarkup).join('');
  $('#libraryEmpty').hidden = cases.length > 0;
  $('#noResults').hidden = cases.length === 0 || results.length > 0;
}
function renderFollowing() {
  const watched = cases.filter(x => x.watch).sort((a,b) => b.updatedAt - a.updatedAt);
  $('#followingList').innerHTML = watched.map(cardMarkup).join('');
  $('#followingEmpty').hidden = watched.length > 0;
}
function renderAll() {
  renderStats(); renderHome(); renderLibrary(); renderFollowing();
}
function go(view) {
  const valid = ['home','library','following','profile'].includes(view) ? view : 'home';
  currentView = valid;
  $$('.view').forEach(section => {
    const active = section.dataset.view === valid;
    section.classList.toggle('active', active);
    section.hidden = !active;
  });
  $$('.nav-item').forEach(button => {
    const active = button.dataset.go === valid;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  window.scrollTo({top:0, behavior:'instant'});
}
function showDialog(dialog) {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open','');
}
function closeDialog(dialog) { if (dialog.open) dialog.close(); else dialog.removeAttribute('open'); }
function openCaseForm(record = null) {
  const form = $('#caseForm');
  form.reset();
  $('#caseDialogTitle').textContent = record ? 'Editar expediente' : 'Añadir expediente';
  const set = (name, value) => { const input = form.elements.namedItem(name); if (input) input.value = value ?? ''; };
  set('id', record?.id || '');
  for (const key of ['title','number','year','court','jurisdiction','status','url','nextDate','notes']) set(key, record?.[key] || (key === 'status' ? 'Activo' : ''));
  form.elements.namedItem('watch').checked = Boolean(record?.watch);
  showDialog($('#caseDialog'));
  setTimeout(() => form.elements.namedItem('title').focus(), 80);
}
function getRecord(id) { return cases.find(record => record.id === id); }
function openDetails(id) {
  const record = getRecord(id);
  if (!record) return;
  selectedCaseId = id;
  $('#detailTitle').textContent = record.title;
  const rows = [
    ['Número',record.number], ['Año',record.year], ['Juzgado / circunscripción',record.court], ['Fuero',record.jurisdiction], ['Estado',record.status], ['Próxima fecha',fmtDate(record.nextDate)], ['Enlace',record.url], ['Notas',record.notes], ['Última modificación',new Intl.DateTimeFormat('es-PY',{dateStyle:'medium',timeStyle:'short'}).format(new Date(record.updatedAt))]
  ].filter(([,value]) => value);
  $('#detailBody').innerHTML = rows.map(([label,value]) => `<div class="detail-row"><small>${escapeHtml(label)}</small><div>${label === 'Enlace' ? `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a>` : escapeHtml(value)}</div></div>`).join('') || '<p class="dialog-copy">Este expediente todavía no tiene información adicional.</p>';
  $('#detailOpen').hidden = !record.url;
  $('#detailWatch').textContent = record.watch ? 'Quitar seguimiento' : 'Agregar a seguimiento';
  showDialog($('#detailDialog'));
}
async function toggleWatch(id) {
  const record = getRecord(id);
  if (!record) return;
  record.watch = !record.watch;
  record.updatedAt = Date.now();
  await saveCase(record); await saveEvent(record.watch ? 'Agregado al seguimiento' : 'Retirado del seguimiento', record);
  await refresh();
  if ($('#detailDialog').open && selectedCaseId === id) $('#detailWatch').textContent = record.watch ? 'Quitar seguimiento' : 'Agregar a seguimiento';
  toast(record.watch ? 'Expediente agregado al seguimiento' : 'Seguimiento desactivado');
}
async function deleteCurrent(id) {
  const record = getRecord(id);
  if (!record) return;
  if (!confirm(`¿Eliminar «${record.title}» de la biblioteca de este dispositivo?`)) return;
  await deleteCase(id); await saveEvent('Expediente eliminado',record);
  closeDialog($('#detailDialog')); selectedCaseId = null;
  await refresh(); toast('Expediente eliminado de este dispositivo');
}
async function handleCaseSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const id = String(data.get('id') || '');
  const previous = id ? getRecord(id) : null;
  const title = normalizeText(data.get('title'));
  const url = normalizeText(data.get('url'));
  if (!title) { toast('La carátula es obligatoria.'); return; }
  if (!validUrl(url)) { toast('Ingresá un enlace HTTP o HTTPS válido.'); form.elements.namedItem('url').focus(); return; }
  const duplicate = cases.find(record => record.id !== id && record.title.toLocaleLowerCase('es') === title.toLocaleLowerCase('es') && record.number === normalizeText(data.get('number')) && record.year === normalizeText(data.get('year')));
  if (duplicate && !confirm('Ya existe una causa con la misma carátula, número y año. ¿Querés guardarla igualmente?')) return;
  const record = normalizeCase({
    ...previous, id: previous?.id || uid(), title, number:data.get('number'), year:data.get('year'), court:data.get('court'), jurisdiction:data.get('jurisdiction'), status:data.get('status'), url, nextDate:data.get('nextDate'), notes:data.get('notes'), watch:data.has('watch'), createdAt:previous?.createdAt || Date.now(), updatedAt:Date.now(), source:previous?.source || 'manual'
  });
  await saveCase(record); await saveEvent(previous ? 'Expediente actualizado' : 'Expediente agregado', record);
  closeDialog($('#caseDialog')); await refresh();
  if (currentView !== 'library') go('library');
  toast(previous ? 'Cambios guardados' : 'Expediente agregado a la biblioteca');
}
function buildBackup() {
  return { app:'SUMARIUM Mobile', schemaVersion:1, exportedAt:new Date().toISOString(), records:cases };
}
function downloadBackup() {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `SUMARIUM_MOBILE_RESPALDO_${new Date().toISOString().slice(0,10)}.json`;
  document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  toast('Respaldo preparado para descargar');
}
function identity(record) {
  return `${record.title.toLocaleLowerCase('es')}|${record.number}|${record.year}|${record.court.toLocaleLowerCase('es')}`;
}
async function importBackup(file) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) throw new Error('El archivo supera el límite de 15 MB.');
  const parsed = JSON.parse(await file.text());
  const incoming = Array.isArray(parsed) ? parsed : parsed?.records;
  if (!Array.isArray(incoming)) throw new Error('El archivo no contiene una lista de expedientes compatible.');
  if (incoming.length > 10000) throw new Error('El respaldo contiene demasiados registros.');
  const current = await getAllCases();
  const byId = new Map(current.map(record => [record.id,record]));
  const byIdentity = new Map(current.map(record => [identity(record),record]));
  let added = 0, updated = 0, ignored = 0;
  for (const raw of incoming) {
    const record = normalizeCase(raw);
    if (!record.title) { ignored++; continue; }
    const existing = byId.get(record.id) || byIdentity.get(identity(record));
    if (!existing) {
      await saveCase(record); byId.set(record.id,record); byIdentity.set(identity(record),record); added++;
    } else if ((record.updatedAt || 0) > (existing.updatedAt || 0)) {
      const merged = normalizeCase({...existing,...record,id:existing.id,createdAt:existing.createdAt});
      await saveCase(merged); byId.set(merged.id,merged); byIdentity.set(identity(merged),merged); updated++;
    } else ignored++;
  }
  await refresh(); await saveEvent('Respaldo importado',null,`${added} nuevos, ${updated} actualizados, ${ignored} omitidos`);
  toast(`Importación: ${added} nuevos · ${updated} actualizados · ${ignored} omitidos`);
}
async function clearLibrary() {
  if (!cases.length) { toast('La biblioteca ya está vacía'); return; }
  const accepted = confirm(`Vas a eliminar ${cases.length} expediente(s) guardado(s) en este dispositivo. Esta acción no se puede deshacer. ¿Continuar?`);
  if (!accepted) return;
  const tx = db.transaction([CASE_STORE,EVENT_STORE],'readwrite');
  tx.objectStore(CASE_STORE).clear(); tx.objectStore(EVENT_STORE).clear(); await txDone(tx);
  await refresh(); go('library'); toast('Biblioteca local vaciada');
}
function attachEvents() {
  document.addEventListener('click', async event => {
    const goButton = event.target.closest('[data-go]');
    if (goButton) { event.preventDefault(); go(goButton.dataset.go); return; }
    const closeButton = event.target.closest('[data-close]');
    if (closeButton) { closeDialog($(`#${closeButton.dataset.close}`)); return; }
    const detailButton = event.target.closest('[data-detail]');
    if (detailButton) { openDetails(detailButton.dataset.detail); return; }
    const watchButton = event.target.closest('[data-watch]');
    if (watchButton) { await toggleWatch(watchButton.dataset.watch); return; }
  });
  $('#addBtn').addEventListener('click', () => openCaseForm());
  $('#quickAdd').addEventListener('click', () => openCaseForm());
  $('#homeAdd').addEventListener('click', () => openCaseForm());
  $('#emptyAdd').addEventListener('click', () => openCaseForm());
  $('#quickBackup').addEventListener('click', downloadBackup);
  $('#caseForm').addEventListener('submit', handleCaseSubmit);
  $('#searchInput').addEventListener('input', renderLibrary);
  $('#clearSearch').addEventListener('click', () => { $('#searchInput').value=''; currentFilter='all'; $$('.filter-chip').forEach(b => b.classList.toggle('active',b.dataset.filter==='all')); renderLibrary(); });
  $$('.filter-chip').forEach(button => button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    $$('.filter-chip').forEach(item => item.classList.toggle('active',item === button)); renderLibrary();
  }));
  $('#detailOpen').addEventListener('click', () => {
    const record = getRecord(selectedCaseId);
    if (!record?.url) return;
    window.location.assign(record.url);
  });
  $('#detailEdit').addEventListener('click', () => {
    const record = getRecord(selectedCaseId); if (!record) return;
    closeDialog($('#detailDialog')); openCaseForm(record);
  });
  $('#detailWatch').addEventListener('click', () => selectedCaseId && toggleWatch(selectedCaseId));
  $('#detailDelete').addEventListener('click', () => selectedCaseId && deleteCurrent(selectedCaseId));
  $('#exportBtn').addEventListener('click', downloadBackup);
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    try { await importBackup(file); } catch (error) { toast(error.message || 'No se pudo importar el respaldo'); }
    event.target.value = '';
  });
  $('#clearAllBtn').addEventListener('click', clearLibrary);
  $('#aboutBtn').addEventListener('click', () => showDialog($('#aboutDialog')));
  $('#installBtn').addEventListener('click', async () => {
    if (!installPrompt) { toast('Abrí el menú del navegador y elegí «Instalar aplicación» o «Añadir a pantalla de inicio».'); return; }
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice?.outcome === 'accepted') toast('Instalación iniciada');
    installPrompt = null;
  });
  window.addEventListener('appinstalled', () => toast('SUMARIUM Mobile quedó instalada'));
  $$('.app-dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) closeDialog(dialog);
    });
  });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('#installBtn').textContent = 'Instalar SUMARIUM Mobile'; });
  window.addEventListener('online', () => { $('#connectionState').innerHTML='<i></i> En línea'; });
  window.addEventListener('offline', () => { $('#connectionState').innerHTML='<i></i> Sin conexión'; });
}
async function init() {
  attachEvents();
  try {
    db = await openDatabase();
    const migrated = await migrateLegacyData();
    await refresh();
    if (migrated) toast(`${migrated} expediente(s) anteriores recuperados`);
  } catch (error) {
    console.error('SUMARIUM Mobile storage error:',error);
    toast('No se pudo iniciar el almacenamiento local. Revisá el navegador.');
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js?v=0.2.0').catch(error => console.warn('Service worker no disponible:',error));
  }
  $('#connectionState').innerHTML = navigator.onLine ? '<i></i> En línea' : '<i></i> Sin conexión';
}
init();
