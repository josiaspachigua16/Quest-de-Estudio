const STORAGE_KEY = 'sumarium-mobile-library-v1';
let cases = loadCases();
let filter = 'all';
const $ = (selector) => document.querySelector(selector);
function loadCases() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(cases)); }
function escapeHtml(s = '') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function render() {
  const q = $('#search').value.trim().toLowerCase();
  const list = cases.filter(c => {
    const text = `${c.title} ${c.number} ${c.year} ${c.court}`.toLowerCase();
    const matchesQuery = !q || text.includes(q);
    const matchesFilter = filter === 'all' || (filter === 'watch' && c.watch) || (filter === 'recent' && Date.now() - c.created < 7 * 864e5);
    return matchesQuery && matchesFilter;
  });
  $('#caseCount').textContent = cases.length;
  $('#watchCount').textContent = cases.filter(c => c.watch).length;
  $('#updatedCount').textContent = cases.filter(c => c.updated).length;
  $('#caseList').innerHTML = list.map(c => `<article class="case-card"><div class="case-icon">▤</div><div class="case-content"><h3>${escapeHtml(c.title)}</h3><div class="case-meta">${escapeHtml([c.number && 'N.º ' + c.number, c.year, c.court].filter(Boolean).join(' · ') || 'Sin datos adicionales')}</div><div class="case-tags"><span class="tag">Biblioteca</span>${c.watch ? '<span class="tag watch">EN SEGUIMIENTO</span>' : ''}</div><div class="card-actions">${c.url ? `<button class="small-btn primary-soft" data-open="${c.id}">Abrir causa</button>` : ''}<button class="small-btn" data-watch="${c.id}">${c.watch ? 'Quitar seguimiento' : 'Seguir'}</button><button class="small-btn" data-delete="${c.id}">Eliminar</button></div></div></article>`).join('');
  $('#empty').classList.toggle('show', cases.length === 0);
  $('#caseList').style.display = cases.length ? 'grid' : 'none';
  if (cases.length && list.length === 0) $('#caseList').innerHTML = '<div class="empty show"><strong>No se encontraron expedientes</strong><p>Probá con otra búsqueda o filtro.</p></div>';
}
function openModal() { $('#modal').classList.add('open'); }
function closeModal() { $('#modal').classList.remove('open'); }
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2300); }
$('#addBtn').onclick = openModal;
$('#emptyAdd').onclick = openModal;
$('#closeModal').onclick = closeModal;
$('#modal').onclick = e => { if (e.target === $('#modal')) closeModal(); };
$('#caseForm').onsubmit = e => {
  e.preventDefault(); const f = new FormData(e.target);
  cases.unshift({id:crypto.randomUUID(), title:f.get('title').trim(), number:f.get('number').trim(), year:f.get('year').trim(), court:f.get('court').trim(), url:f.get('url').trim(), watch:f.has('watch'), created:Date.now(), updated:false});
  persist(); render(); e.target.reset(); closeModal(); toast('Expediente guardado en este dispositivo');
};
$('#search').oninput = render;
 document.querySelectorAll('.filter').forEach(b => b.onclick = () => { filter = b.dataset.filter; document.querySelectorAll('.filter').forEach(x => x.classList.toggle('active', x === b)); render(); });
$('#caseList').onclick = e => {
  const open = e.target.closest('[data-open]'), watch = e.target.closest('[data-watch]'), del = e.target.closest('[data-delete]');
  if (open) { const c = cases.find(x => x.id === open.dataset.open); if (c?.url) window.location.assign(c.url); }
  if (watch) { const c = cases.find(x => x.id === watch.dataset.watch); if (c) { c.watch = !c.watch; persist(); render(); toast(c.watch ? 'Agregado al seguimiento' : 'Seguimiento desactivado'); } }
  if (del) { cases = cases.filter(x => x.id !== del.dataset.delete); persist(); render(); toast('Expediente eliminado'); }
};
document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => {
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x === b)); const view = b.dataset.view;
  if (view === 'library') { $('#search').focus(); toast('Biblioteca de expedientes'); }
  else if (view === 'alerts') { filter = 'watch'; document.querySelectorAll('.filter').forEach(x => x.classList.toggle('active', x.dataset.filter === 'watch')); render(); toast('Expedientes en seguimiento'); }
  else if (view === 'profile' || view === 'home') toast(view === 'profile' ? 'Versión móvil local · v0.1.0' : 'Inicio');
});
$('#settingsBtn').onclick = () => alert('SUMARIUM Mobile v0.1.0\nPrototipo local. La sincronización con escritorio y conexión a Gestión de Partes todavía no están configuradas.');
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
