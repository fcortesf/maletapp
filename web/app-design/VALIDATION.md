# Revisión del prototipo

Revisión realizada el 9 de septiembre de 2026 con Chromium 153, Playwright 1.63.0 y axe 4.13.0.

## Resultado

20 grupos de comprobaciones de `tests/browser.mjs` completados. Sin errores JavaScript durante el recorrido. Sin infracciones detectadas por axe en las vistas auditadas con reglas WCAG 2 A/AA y 2.1 AA.

- Flujos: crear viajes, destino obligatorio, fechas coherentes, fechas parciales, añadir y editar items, cancelar cambios, sugerencias, cantidades enteras positivas, notas, marcado y progreso.
- Datos: persistencia después de recargar, escape de texto introducido y asignación automática al equipaje por defecto.
- Eliminación: cancelación y confirmación de items y viajes; aviso sobre datos asociados y estado de enlace eliminado.
- Variantes: filtros de viajes e items, categorías agrupadas y plegables, finalización y reapertura, lista vacía, carga, error, reintento y restauración de ejemplos.
- Accesibilidad: auditoría del listado, formulario con errores, confirmación, detalle en escritorio y móvil, guía en ambos temas y detalle nocturno. Ciclo de teclado dentro del diálogo y movimiento reducido.
- Responsive: sin desbordamiento horizontal a 320, 390, 430, 768, 1024 y 1440 px en listado, detalle y guía.

Comprobaciones complementarias: regreso del foco al botón de añadir después de Escape, uso en memoria cuando `localStorage` está bloqueado y conservación de la página de guía al operar sobre su tarjeta de ejemplo.

## Revisión visual

Se inspeccionaron capturas reales de listado, detalle, formulario móvil, tema nocturno y guía, incluidos color y componentes. Se compactó el resumen móvil para que el primer item completo quede por encima del botón fijo a 390 × 844 px. Se ajustó el contraste del texto secundario sobre la superficie verde y se evitó interpolar fondos de botones al cambiar de tema.

La dirección artística se mantiene en todas las vistas: postales vectoriales, papel cálido, titulares serif, tinta verde y acciones terracota. Las filas se separan con divisores, sin tarjetas individuales. Las categorías y la finalización quedan identificadas como variantes futuras.

Las capturas generadas están disponibles localmente en `test-results/` (ignorado por Git).

## Alcance

La verificación automatizada y visual se ha realizado en Chromium. Queda pendiente una auditoría manual con lectores de pantalla, Safari/Firefox y teléfonos físicos, incluida la aparición del teclado virtual. No se ha conectado ninguna API ni validado integración con el backend.
