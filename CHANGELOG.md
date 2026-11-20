# SUMARIUM Mobile — cambios v0.2.0

## Corregido respecto de v0.1.0

- Reescrito el encabezado HTML: se corrige el fragmento de título que aparecía como texto (`itle>SUMARIUM Mobile`).
- Rediseñada la barra inferior para que sus cuatro destinos se muestren horizontalmente, con estados activos y áreas seguras de Android.
- El formulario de expediente pasa a un diálogo responsivo, con controles a ancho completo, campos agrupados y desplazamiento interno.
- La navegación ahora muestra vistas diferenciadas: Inicio, Biblioteca, Seguimiento y Perfil.

## Funcionalidad añadida

- Alta y edición de expedientes.
- Ficha detallada con acceso a la causa, cuando exista una URL.
- Campos de fuero, estado, circunscripción, próxima fecha y notas.
- Búsqueda y filtros funcionales.
- Biblioteca general independiente del seguimiento manual.
- Almacenamiento persistente en IndexedDB.
- Migración de los registros v0.1.0 almacenados en `localStorage` si se mantiene el mismo origen.
- Respaldo JSON, importación combinada y deduplicación.
- Iconos PWA PNG 192/512 y Apple touch icon.
- Service worker versionado para invalidar la caché del shell anterior.

## Aún no implementado

- Sincronización con la extensión de escritorio.
- Inicio de sesión, API/backend y escaneo de Gestión de Partes.
- Descarga de actuaciones/documentos, OCR e IA.
- Notificaciones push y vigilancia automática.
