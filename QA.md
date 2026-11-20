# QA — SUMARIUM Mobile v0.2.0

## Comprobaciones realizadas

- `app.js`: pasa `node --check`.
- `sw.js`: pasa `node --check`.
- `styles.css`: parseo PostCSS correcto.
- `manifest.webmanifest`: JSON válido.
- HTML: analizado con `HTMLParser`; comprobado el título correcto.
- Estructura: 48 IDs HTML únicos; los 55 selectores de ID encontrados en JavaScript tienen elemento correspondiente.
- Recursos: existen las referencias CSS, JavaScript, manifest y todos los iconos listados.
- ZIP: se valida CRC después de empaquetar.

## Límites de esta validación

Intenté abrir la PWA en Chromium headless para una prueba de interacción y captura a 390 × 844; el entorno de ejecución bloqueó la navegación local con `ERR_BLOCKED_BY_ADMINISTRATOR`. Por tanto, no presento una prueba real de renderizado/interacción automatizada como aprobada.

Tampoco se probó todavía en el teléfono del usuario, en Cloudflare Pages, ni en una instalación Android. La primera validación real deberá comprobar:

1. Que el encabezado no muestre texto HTML suelto.
2. Que la navegación inferior tenga cuatro opciones horizontales.
3. Que el formulario se adapte al ancho del teléfono y pueda desplazarse sin quedar bajo la navegación.
4. Crear, editar, buscar y eliminar una causa.
5. Cerrar y reabrir la aplicación y comprobar persistencia.
6. Exportar/importar un JSON sin duplicar registros.
7. Instalar desde el navegador y abrir en modo independiente.

## Integraciones no probadas / no implementadas

La app no sincroniza con SUMARIUM Desktop, no inicia sesión en Gestión de Partes, no escanea expedientes, no descarga documentos, no ejecuta OCR/IA ni envía notificaciones push. Esas capacidades requieren diseño de backend y autenticación compartida.
