# SUMARIUM Mobile v0.2.1 — publicación en Cloudflare Pages

Este paquete está preparado para Direct Upload. Los archivos del sitio están directamente en la raíz del ZIP: `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, iconos y `_headers`.

## Antes de publicar

La captura muestra `quest-de-estudio.pages.dev`. No reemplaces los archivos de ese proyecto ni publiques SUMARIUM dentro de él: el destino debe ser un proyecto Pages independiente.

## Crear el proyecto independiente

1. Abrí Cloudflare y entrá en Workers & Pages.
2. Elegí Create application → Pages → Direct Upload (los rótulos pueden variar ligeramente).
3. Creá un proyecto nuevo llamado `sumarium-mobile` (si está ocupado, elegí `sumarium-mobile-app`).
4. Arrastrá este ZIP y elegí Deploy site.
5. Abrí el dominio nuevo asignado, por ejemplo `sumarium-mobile.pages.dev`.
6. Confirmá que la cabecera muestre el indicador `v0.2.1`. Si no aparece, no estás viendo esta compilación.

Cloudflare admite ZIP o carpeta para Direct Upload desde el panel: https://developers.cloudflare.com/pages/get-started/direct-upload/

## Datos existentes en la v0.1.0

El almacenamiento del navegador está aislado por dominio. Si hay registros en el dominio anterior, exportá primero un respaldo JSON desde Perfil → Respaldos e importalo en el dominio nuevo. El sitio nuevo no puede leer automáticamente el almacenamiento local del dominio anterior.

## Alcance

Incluye Inicio, Biblioteca, Seguimiento, Perfil, alta/edición, detalle, búsqueda, filtros, IndexedDB, respaldo/importación JSON y caché PWA. Todavía no tiene backend compartido, sincronización con SUMARIUM Desktop, escaneo del portal judicial, descargas, OCR/IA ni notificaciones push.
