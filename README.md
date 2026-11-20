# SUMARIUM Mobile v0.1.0 — prototipo PWA

Instalable en Android desde un navegador compatible mediante **Añadir a pantalla de inicio**.

## Estado y limitaciones
- Prototipo funcional de interfaz móvil y biblioteca local.
- Alta, búsqueda, filtrado, seguimiento y apertura de URL en la misma pestaña de la app.
- Persistencia local en `localStorage`.
- Cache offline de shell mediante Service Worker.
- No sincroniza aún con SUMARIUM Desktop/Chrome extension, ni se conecta al portal judicial, backend, autenticación, OCR/IA, ni notificaciones push. Los expedientes agregados son locales a este dispositivo.
- Requiere servirlo desde HTTPS (o localhost) para instalar PWA y Service Worker.

## Ejecutar local
Serví esta carpeta en un host HTTPS o con servidor local. Abrí `index.html` en navegador para una prueba simple; las funciones PWA (service worker/install) requieren HTTPS o localhost.
