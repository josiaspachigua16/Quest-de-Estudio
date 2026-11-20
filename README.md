# SUMARIUM Mobile v0.2.0

Progressive Web App (PWA) estática para Android y otros navegadores móviles. Diseñada como complemento de SUMARIUM de escritorio, no como reemplazo de la extensión.

## Qué está implementado

- Diseño responsive con navegación inferior propia, respetando las áreas seguras de Android.
- Inicio con métricas y expedientes recientes.
- Biblioteca local con búsqueda y filtros.
- Alta y edición de expedientes: carátula, número, año, juzgado/circunscripción, fuero, estado, URL, próxima fecha y notas.
- Ficha de detalle, seguimiento manual y eliminación individual.
- Seguimiento como vista separada, sin confundirlo con la biblioteca general.
- Persistencia en IndexedDB.
- Migración automática de registros que la v0.1.0 guardó en `localStorage` en el mismo origen.
- Exportación e importación JSON con combinación y deduplicación de expedientes.
- Service worker con caché de la aplicación para abrir la interfaz sin conexión.
- Comprobación de campos y URLs; enlaces externos solo HTTP/HTTPS.

## Qué todavía NO está conectado

- No sincroniza automáticamente con la extensión SUMARIUM de escritorio: no se ha configurado un backend compartido ni una API autenticada.
- No inicia sesión en Gestión de Partes ni escanea expedientes del Poder Judicial.
- No descarga expedientes, anexos ni certificados.
- No incluye OCR, IA contextual, análisis de actuaciones ni notificaciones push.
- El seguimiento es una lista manual; no consulta novedades por sí solo.

No ingresar contraseñas judiciales ni considerar esta versión como repositorio único de documentación. Exportar respaldos periódicos.

## Despliegue en Cloudflare Pages

1. Extraer el ZIP. La carpeta `SUMARIUM_MOBILE_v0_2_0` contiene directamente `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js` e `icon.svg`.
2. Crear un proyecto Pages separado para SUMARIUM Mobile (no sobrescribir el proyecto de Quest de Estudio).
3. Cargar el contenido de la carpeta como raíz del sitio. No publicar la carpeta contenedora como subcarpeta adicional salvo que se configure el mismo `base path`.
4. Abrir el dominio HTTPS y comprobar que `/`, `/styles.css?v=0.2.0`, `/app.js?v=0.2.0`, `/manifest.webmanifest` y `/sw.js?v=0.2.0` devuelven sus archivos correctos.
5. En Android, abrir el sitio con un navegador compatible y usar “Instalar aplicación” o “Añadir a pantalla de inicio”.

## Actualización desde v0.1.0

Desplegar v0.2.0 en el MISMO origen/dominio y ruta para permitir la migración de `localStorage` a IndexedDB. No borrar datos del sitio ni limpiar el almacenamiento del navegador antes de que la migración se complete. La aplicación marca la migración una vez; exportar un respaldo antes de reemplazar una instalación de prueba.

## Pruebas manuales recomendadas

- Alta, edición y eliminación de una causa.
- Búsqueda por carátula, número, juzgado y notas.
- Activar/desactivar seguimiento.
- Abrir y cerrar ficha de detalle.
- Exportar JSON e importarlo de nuevo; no deben aparecer duplicados.
- Recargar la app, cerrar el navegador y reabrirla; los registros deben seguir.
- Probar modo avión después de haber abierto la app al menos una vez.
- Instalar en la pantalla de inicio y verificar que la navegación inferior no tape el contenido.
