import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(process.env.MALETAPP_TEST_PACKAGE || import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const base = process.env.MALETAPP_TEST_URL || 'http://127.0.0.1:4173';
const output = new URL('../test-results/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-ES' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const checks = [];
function passed(name) { checks.push(name); console.log(`PASS ${name}`); }
async function route(hash) {
  await page.goto(`${base}/${hash}`);
  await settled();
}
async function settled() { await page.waitForFunction(() => document.querySelector('#main').dataset.route === location.hash); }
async function noOverflow(label) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: horizontal overflow`);
}
async function axe(label) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
  });
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({target:n.target, summary:n.failureSummary})) })), [], label);
  passed(`Accesibilidad automatizada: ${label}`);
}
try {
  await route('#trips');
  assert.equal(await page.locator('.trip-card').count(), 3);
  await page.screenshot({ path: `${output}home-desktop.png`, fullPage: true });
  await axe('listado claro');
  await page.getByRole('button', {name:'Pasados',exact:false}).click();
  assert.equal(await page.locator('.trip-info h2').innerText(), 'Copenhague');
  await page.getByRole('button', {name:'Finalizados',exact:false}).click();
  assert.equal(await page.locator('.trip-info h2').innerText(), 'Menorca');
  passed('Filtros de viajes activos, pasados y finalizados');

  await page.getByRole('button', {name:'Nuevo viaje',exact:true}).click();
  await page.getByRole('button',{name:'Crear viaje',exact:true}).click();
  assert.match(await page.locator('#destination-error').innerText(), /Indica un destino/);
  await page.locator('#destination').fill('Prueba & <viaje>');
  await page.locator('#start').fill('2027-06-10');
  await page.locator('#end').fill('2027-06-01');
  await page.getByRole('button',{name:'Crear viaje',exact:true}).click();
  assert.match(await page.locator('#end-error').innerText(), /posterior/);
  await axe('formulario con errores');
  await page.locator('#end').fill('2027-06-15');
  await page.getByRole('button',{name:'Crear viaje',exact:true}).click();
  await page.waitForURL('**/#trip/**');
  await settled();
  assert.equal(await page.locator('h1').innerText(), 'Prueba & <viaje>');
  assert.ok(await page.getByRole('heading',{name:'Tu maleta todavía está vacía'}).isVisible());
  const createdHash = new URL(page.url()).hash;
  passed('Destino obligatorio, fechas coherentes, escape de HTML y viaje vacío');

  await page.getByRole('button',{name:'Añadir primer item'}).click();
  await page.locator('#editor-form').getByRole('button',{name:'Añadir item',exact:true}).click();
  assert.match(await page.locator('#name-error').innerText(), /Escribe/);
  await page.getByRole('button',{name:'Pasaporte',exact:true}).click();
  assert.equal(await page.locator('#name').inputValue(),'Pasaporte');
  await page.locator('#quantity').fill('0');
  await page.locator('#editor-form').getByRole('button',{name:'Añadir item',exact:true}).click();
  assert.match(await page.locator('#quantity-error').innerText(), /mayor que cero/);
  await page.locator('#quantity').fill('1.5');
  await page.locator('#editor-form').getByRole('button',{name:'Añadir item',exact:true}).click();
  assert.match(await page.locator('#quantity-error').innerText(), /entero/);
  await page.locator('#quantity').fill('2');
  await page.locator('#notes').fill('En el bolsillo <pequeño> & seguro');
  await page.locator('#editor-form').getByRole('button',{name:'Añadir item',exact:true}).click();
  assert.equal(await page.locator('.item-row').count(),1);
  assert.equal(await page.locator('.item-state').innerText(),'Pendiente');
  assert.equal(await page.locator('.item-note').innerText(),'En el bolsillo <pequeño> & seguro');
  assert.equal(await page.locator('.packing-summary progress').getAttribute('value'),'0');
  await page.locator('.check-target input').check();
  assert.equal(await page.locator('.packing-summary progress').getAttribute('value'),'100');
  passed('Sugerencias, cantidad positiva entera, notas escapadas y progreso 0 → 100');

  await page.getByRole('button',{name:'Editar Pasaporte',exact:true}).click();
  await page.locator('#name').fill('No guardar');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.match(await page.locator('.item-name').innerText(),/Pasaporte/);
  await page.getByRole('button',{name:'Editar Pasaporte',exact:true}).click();
  await page.locator('#name').fill('Mi objeto personal');
  await page.locator('#quantity').fill('');
  await page.locator('#ready').uncheck();
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  assert.equal(await page.locator('.quantity').count(),0);
  assert.equal(await page.locator('.packing-summary progress').getAttribute('value'),'0');
  await page.reload();
  assert.match(await page.locator('.item-name').innerText(),/Mi objeto personal/);
  const stored = await page.evaluate(()=>JSON.parse(localStorage.getItem('maletapp.prototype.v1')));
  const trip=stored.find(t=>t.destination==='Prueba & <viaje>');
  assert.equal(trip.items[0].baggageId,trip.baggageId);
  passed('Cancelar sin mutar, edición, cantidad opcional, persistencia y equipaje automático');

  await page.getByRole('button',{name:'Eliminar Mi objeto personal',exact:true}).click();
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.equal(await page.locator('.item-row').count(),1);
  await page.getByRole('button',{name:'Eliminar Mi objeto personal',exact:true}).click();
  await axe('confirmación destructiva');
  await page.getByRole('button',{name:'Eliminar item',exact:true}).click();
  assert.equal(await page.locator('.item-row').count(),0);
  await page.locator('.trip-menu summary').click();
  await page.getByRole('button',{name:'Eliminar viaje',exact:true}).click();
  assert.match(await page.locator('#confirm-description').innerText(),/todos sus datos asociados/);
  await page.locator('#confirm-dialog').getByRole('button',{name:'Eliminar viaje',exact:true}).click();
  await page.waitForURL('**/#trips');
  await settled();
  await route(createdHash);
  assert.match(await page.locator('h1').innerText(),/no está aquí/);
  passed('Cancelación y eliminación confirmada de item y viaje; enlace eliminado');

  await route('#trip/lisboa');
  assert.equal(await page.locator('.item-row').count(),8);
  await page.locator('#list-mode').selectOption('grouped');
  assert.ok(await page.locator('.category').count()>3);
  await page.locator('#list-mode').selectOption('collapsed');
  await page.locator('details.category summary').first().click();
  assert.equal(await page.locator('details.category').first().getAttribute('open'),null);
  await page.locator('#list-mode').selectOption('flat');
  await page.getByRole('button',{name:'Pendientes',exact:false}).click();
  assert.equal(await page.locator('.item-row').count(),4);
  await page.getByRole('button',{name:'Todos',exact:false}).click();
  await page.locator('#toast').evaluate(el=>el.classList.remove('visible'));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#toast')).opacity==='0');
  await page.screenshot({path:`${output}detail-desktop.png`,fullPage:true});
  await axe('detalle claro');
  passed('Categorías agrupadas y plegables; filtros de preparación');

  await page.locator('.trip-menu summary').click();
  await page.getByRole('button',{name:'Marcar como finalizado',exact:false}).click();
  await page.locator('#confirm-dialog').getByRole('button',{name:'Marcar como finalizado',exact:true}).click();
  assert.match(await page.locator('.detail-heading .badge').innerText(),/Finalizado/);
  await page.locator('.trip-menu summary').click();
  await page.getByRole('button',{name:'Volver a preparar',exact:false}).click();
  await page.locator('#confirm-dialog').getByRole('button',{name:'Volver a preparar',exact:true}).click();
  assert.match(await page.locator('.detail-heading .badge').innerText(),/En preparación/);
  passed('Finalización futura y reapertura reversible');
  await page.locator('#toast').evaluate(el=>el.classList.remove('visible'));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#toast')).opacity==='0');

  for(const width of [320,390,430,768,1024,1440]) {
    await page.setViewportSize({width,height:844});
    await route('#trips');await noOverflow(`home ${width}`);
    if(width===390) await page.screenshot({path:`${output}home-mobile.png`,fullPage:true});
    await route('#trip/lisboa');await noOverflow(`detail ${width}`);
    if(width===390) {
      await page.screenshot({path:`${output}detail-mobile.png`,fullPage:true});
      await axe('detalle móvil');
      await page.locator('.mobile-action button').click();
      await noOverflow('bottom sheet');
      for (let tab=0;tab<12;tab++) {
        await page.keyboard.press('Tab');
        assert.ok(await page.evaluate(()=>document.querySelector('#form-dialog').contains(document.activeElement)));
      }
      await page.screenshot({path:`${output}form-mobile.png`,fullPage:true});
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#form-dialog').evaluate(el=>el.open),false);
    }
    await route('#design');await noOverflow(`design ${width}`);
  }
  passed('Sin desbordamiento a 320, 390, 430, 768, 1024 y 1440 px; bottom sheet móvil');

  await axe('guía de diseño clara');
  for(const state of ['empty','loading','error','normal']) {
    await page.locator(`[data-action="demo-state"][data-state="${state}"]`).click();
    if(state==='loading')assert.equal(await page.locator('#state-demo').getAttribute('aria-busy'),'true');
    if(state==='error') {await page.getByRole('button',{name:'Volver a intentar'}).click();assert.equal(await page.locator('#state-demo .trip-card').count(),1);}
  }
  await page.screenshot({path:`${output}design-system.png`,fullPage:true});
  await page.locator('#theme-toggle').click();
  await axe('guía de diseño nocturna');
  await route('#trip/lisboa');await axe('detalle nocturno');
  await page.screenshot({path:`${output}detail-night.png`,fullPage:true});
  passed('Estados vacío/carga/error/reintento, guía visual y tema nocturno');

  await route('#trips');
  await page.getByRole('button',{name:'Nuevo viaje',exact:true}).click();
  await page.locator('#destination').fill('Sin fechas');
  await page.getByRole('button',{name:'Crear viaje',exact:true}).click();
  await page.waitForURL('**/#trip/**');
  await settled();
  assert.match(await page.locator('.detail-heading .date-line').innerText(),/Sin fechas/);
  await route('#trips');
  await page.getByRole('button',{name:'Nuevo viaje',exact:true}).click();
  await page.locator('#destination').fill('Sólo vuelta');
  await page.locator('#end').fill('2028-04-04');
  await page.getByRole('button',{name:'Crear viaje',exact:true}).click();
  await page.waitForURL('**/#trip/**');
  await settled();
  assert.match(await page.locator('.detail-heading .date-line').innerText(),/Hasta el/);
  passed('Viajes sin fechas y con fecha parcial');

  await page.evaluate(()=>localStorage.setItem('maletapp.prototype.v1','[]'));
  await page.reload();
  await route('#trips');
  assert.equal(await page.locator('.trip-card').count(),0);
  assert.ok(await page.getByRole('button',{name:'Crear mi primer viaje'}).isVisible());
  await route('#design');
  await page.getByRole('button',{name:'Restaurar datos de ejemplo'}).click();
  await page.getByRole('button',{name:'Restaurar ejemplos',exact:true}).click();
  await page.waitForURL('**/#trips');
  await settled();
  assert.equal(await page.locator('.trip-card').count(),3);
  passed('Estado inicial vacío y restauración con confirmación');

  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
  assert.deepEqual(errors,[]);
  passed('Movimiento reducido y ausencia de errores JavaScript');
  console.log(`\n${checks.length} grupos de comprobaciones completados. Capturas: ${output}`);
} finally { await browser.close(); }
