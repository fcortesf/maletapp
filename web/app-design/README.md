# Maletapp · Cuaderno de viaje

Prototipo navegable en HTML, CSS y JavaScript vanilla, sin compilación ni dependencias de ejecución. Todos los recursos son locales. Abre `index.html` directamente o sirve esta carpeta con `python3 -m http.server 4173` y visita `http://localhost:4173`.

## Recorrido

1. **Mis viajes:** tres viajes activos, un viaje pasado y una variante finalizada. Filtros, postales SVG, progreso y menús secundarios.
2. **Nuevo viaje:** destino obligatorio, fechas opcionales y validación junto al campo. Guardar abre el detalle.
3. **Detalle:** checklist, notas, cantidades, preparación, edición y eliminación con confirmación. Resumen fijo en escritorio y botón inferior en móvil.
4. **Guía de diseño:** dirección artística, tokens, componentes reales, estados simulados, categorías y catálogo de iconos. Incluye restauración de ejemplos con confirmación.

## Decisiones UX

- Un cuaderno de viaje es la referencia visual: papel marfil, tinta verde, terracota, titulares serif y postales vectoriales originales. Los listados se separan con divisores; las superficies se reservan para objetos y capas que las necesitan.
- El destino basta para crear un viaje. «Sin fechas · A tu ritmo» da sentido a los planes abiertos. Se admiten también fechas parciales.
- La cantidad representa unidades enteras positivas; el progreso cuenta items, no unidades. No se mueve un item al marcarlo para mantener la posición durante la preparación.
- Un nuevo item empieza pendiente. Las sugerencias son opcionales y asignan icono y categoría. Un nombre libre funciona con un icono neutro y categoría «Otros».
- Cada viaje tiene `baggageId`; todos sus items se asignan internamente a ese equipaje. Nunca se pide seleccionar una maleta.
- Los formularios mantienen los datos originales hasta guardar. Los diálogos nativos gestionan teclado y foco; las eliminaciones enfocan «Cancelar» inicialmente.
- No hay peticiones remotas, fuentes externas ni analítica. `localStorage` conserva los cambios cuando está disponible; si falla, se informa y se trabaja en memoria.

## Sistema visual

`tokens.css` define colores semánticos, familias tipográficas, tamaños, espacios, radios, bordes, sombras y movimiento. El tema nocturno demuestra el cambio de aspecto sin alterar componentes. La guía dentro de la aplicación muestra los valores del tema activo.

`styles.css` comienza con una columna para móvil. A 600 px aparecen dos postales y modales centrados; a 900 px, tres postales y resumen lateral; a 1200 px aumenta el aire. Ancho de contenido máximo: 1160 px. SVG decorativos ocultos a tecnologías de asistencia, labels visibles, controles nativos y región viva para actualizaciones. Se respeta `prefers-reduced-motion`.

## Funciones futuras

- **Finalización:** estado, filtro, confirmación y reapertura simulados, siempre etiquetados como vista previa. Reabrir conserva items y marcas; un viaje con fechas pasadas vuelve a «Pasados».
- **Categorías:** selección de vista simple, agrupada o plegable en el detalle. Conteo y progreso por categoría. Sin selector de categoría en el formulario básico.
- **Catálogo:** diez sugerencias con iconos SVG extensibles, categoría y ayuda opcional. Una futura API puede sustituir los datos de `data.js`.
- Fuera de alcance: autenticación, sincronización, API, varios equipajes, edición de fechas de viajes existentes y categorización manual.

## Archivos

- `index.html`: shell semántico y capas compartidas.
- `tokens.css`: tema claro/nocturno y fundamentos.
- `styles.css`: componentes y adaptación responsive.
- `data.js`: catálogo y ejemplos con fechas relativas al primer arranque.
- `app.js`: componentes de plantilla, rutas por hash, formularios, estado y persistencia. Las cadenas introducidas por el usuario se escapan antes de renderizar.

La navegación funciona también con `file://`; se recomienda un servidor local para que el almacenamiento tenga un origen estable. No se crean commits ni se modifica `src/`.

## Verificación reproducible

Las dependencias de `package.json` se usan únicamente para verificar el prototipo. Desde esta carpeta:

```sh
npm install
npx playwright install chromium
npm start
```

Con el servidor activo, ejecuta `npm test` en otra terminal. En Linux, Chromium necesita sus bibliotecas del sistema; Playwright permite prepararlas con `npx playwright install-deps chromium` si no están disponibles.

La batería recorre creación, validaciones, cancelación, sugerencias, edición, cantidades, notas, preparación, persistencia, asignación automática de equipaje, eliminaciones, filtros, categorías, finalización y reapertura. Comprueba desbordamiento a 320, 390, 430, 768, 1024 y 1440 px y ejecuta axe sobre las vistas principales y ambos temas. Las capturas se generan en `test-results/`, ignorado por Git. Las comprobaciones automáticas complementan la revisión visual; no sustituyen una auditoría manual con lectores de pantalla y dispositivos físicos.
