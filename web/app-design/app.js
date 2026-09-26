/* Vanilla JS. Vistas por hash, componentes de plantilla y eventos delegados.
   Los datos de usuario siempre se escapan antes de insertarlos en HTML. */
(() => {
  'use strict';
  const { categories, presets, seed, date } = window.MaletappData;
  const $ = (s, parent = document) => parent.querySelector(s);
  const $$ = (s, parent = document) => [...parent.querySelectorAll(s)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const paths = {
    suitcase: '<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M8 10v7m8-7v7M8 21v1m8-1v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>', back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>', more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h2m4 0h2m-8 4h2"/>',
    check: '<path d="m5 12 4 4L19 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flag: '<path d="M5 22V3c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    edit: '<path d="m15 4 5 5M4 15l12-12a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3L9 20l-6 1z"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    moon: '<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    pin: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
    leaf: '<path d="M20 3C7 2 2 9 5 16s16 4 15-13ZM4 21 16 8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    warning: '<path d="m12 3 10 18H2Z M12 9v5m0 3v.1"/>',
    passport: '<rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="10" r="4"/><path d="M8 10h8m-4-4c-2 2-2 6 0 8 2-2 2-6 0-8M9 18h6"/>',
    id: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M4 16c0-4 8-4 8 0m3-6h4m-4 4h4"/>',
    plug: '<path d="M8 2v5m8-5v5M5 7h14v4a7 7 0 0 1-14 0Zm7 11v4"/>',
    brush: '<path d="M10 10v10a2 2 0 0 0 4 0V3H8m0 3h6m-6 3h6M7 2v8"/>',
    shirt: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z"/>',
    pants: '<path d="M6 3h12l2 18h-6l-2-10-2 10H4Zm0 4h12M12 3v5"/>',
    health: '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6V3h8v3m-4 5v6m-3-3h6"/>',
    headphones: '<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="12" width="5" height="9" rx="2"/><rect x="16" y="12" width="5" height="9" rx="2"/>',
    glasses: '<circle cx="6" cy="14" r="4"/><circle cx="18" cy="14" r="4"/><path d="M10 14h4M2 13l2-8h3m15 8-2-8h-3"/>',
    tag: '<path d="M3 3h8l11 11-8 8L3 11Z"/><circle cx="7" cy="7" r="1"/>',
  };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.tag}</svg>`;
  const css = name => `var(--color-illustration-${name})`;
  function landscape(kind = 'mountain') {
    const sky = css('sky'), light = css('light'), mid = css('mid'), dark = css('dark'), clay = css('clay');
    let shapes;
    if (kind === 'city') shapes = `<circle cx="288" cy="48" r="24" fill="${light}"/><path d="M0 127 108 85l143 37 109-37v145H0Z" fill="${mid}"/><path d="M0 190 360 113v117H0Z" fill="${dark}"/><path d="m36 167 173-27 151 55v35H90Z" fill="${light}"/><path d="m172 153 18-4 89 81h-30Z" fill="${clay}"/><path d="M24 167V84h64v72m10-2V65h70v77m21 0V93h70v69m17 6V104h62v85" fill="${clay}"/><path d="m19 84 37-22 37 22m0-19 40-25 40 25m10 28 41-23 41 23m6 11 36-24 36 24" fill="${dark}"/><path d="M44 100h10v16H44zm22 0h10v16H66zm-22 29h10v16H44zm22 0h10v16H66zm49-48h12v17h-12zm25 0h12v17h-12zm-25 29h12v17h-12zm25 0h12v17h-12zm66-1h12v18h-12zm23 0h12v18h-12zm63 13h10v17h-10zm20 0h10v17h-10z" fill="${light}"/><path d="M303 196v-48m-11 0h22" stroke="${dark}" stroke-width="3"/><path d="M0 26q80 30 178-3" fill="none" stroke="${dark}" opacity=".4"/><path d="m75 37 0 15 13 1 0-14m14-1v12l12-2V36" fill="${light}"/>`;
    else if (kind === 'sea') shapes = `<circle cx="279" cy="54" r="27" fill="${light}"/><path d="M0 112q90-9 180 0t180 0v118H0Z" fill="${mid}"/><path d="M0 141q90-9 180 0t180 0M0 166q90-9 180 0t180 0" fill="none" stroke="${light}" opacity=".5"/><path d="M0 160q60-2 95 28t265 14v28H0Z" fill="${light}"/><path d="m35 207 21-34h50l-11 34Z" fill="${clay}"/><path d="M64 192V93" stroke="${dark}" stroke-width="3"/><path d="M20 111q42-60 87 0Z" fill="${clay}"/><path d="M41 111q22-60 43 0Z" fill="${light}"/><path d="m225 139 23-43v43Z" fill="${light}"/><path d="M248 86v61m-28 0h44l-9 8h-25Z" fill="${dark}" stroke="${dark}" stroke-width="2"/><path d="M305 195c-20-26-1-44 5-13 4-34 23-30 5 6 28-20 36-2 2 7l-1 35" fill="${dark}"/><path d="m151 57 6-3 6 3m13 14 5-3 5 3" fill="none" stroke="${dark}" stroke-width="2"/>`;
    else shapes = `<circle cx="277" cy="55" r="27" fill="${light}"/><path d="M0 164 75 40l75 94 58-110 93 140 30-45 29 57v54H0Z" fill="${mid}"/><path d="m47 86 28-46 41 53-32-18-12 16-11-11Zm128-1 33-61 43 65-28-19-10 16-12-23Z" fill="${light}"/><path d="m74 230 95-118 52 65 56-81 83 134Z" fill="${dark}"/><path d="M0 191q71-57 147 10t213-8v37H0Z" fill="${clay}"/><path d="M183 230q-63-27-20-39t-4-20" fill="none" stroke="${light}" stroke-width="10"/><path d="m24 200 14-35 14 35h-11v25h-6v-25Zm274 7 15-39 15 39h-11v23h-7v-23Z" fill="${dark}"/>`;
    return `<svg class="landscape" viewBox="0 0 360 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="360" height="230" fill="${sky}"/>${shapes}</svg>`;
  }
  function travelArt() {
    return `<svg viewBox="0 0 430 320" fill="none" aria-hidden="true"><path d="M48 247C-2 143 78 2 204 22s197 124 156 211" fill="${css('sky')}"/><path d="M16 274h392" stroke="${css('mid')}"/><path d="M336 70c67-22 84 40 35 66S265 143 299 182" stroke="${css('dark')}" stroke-dasharray="4 6"/><path d="m319 53 42-3-29 31 1-17Z" fill="${css('clay')}"/><g transform="rotate(-12 121 177)"><rect x="56" y="80" width="139" height="177" rx="4" fill="var(--color-surface)" stroke="${css('mid')}"/><path d="M68 92h115v120H68Z" fill="${css('light')}"/><path d="m68 183 37-63 38 47 19-28 21 43v30H68Z" fill="${css('mid')}"/><path d="m95 137 10-17 15 19-16-7Z" fill="var(--color-surface)"/><circle cx="157" cy="112" r="12" fill="${css('clay')}"/><path d="M82 230h87m-67 9h47" stroke="${css('mid')}"/></g><g transform="rotate(8 258 190)"><rect x="178" y="110" width="148" height="157" rx="19" fill="${css('clay')}"/><path d="M225 110V95a12 12 0 0 1 12-12h30a12 12 0 0 1 12 12v15" stroke="${css('dark')}" stroke-width="9"/><path d="M207 114v148m90-148v148" stroke="${css('light')}" stroke-width="9"/><rect x="229" y="152" width="48" height="58" rx="3" fill="${css('light')}"/><path d="m240 185 9-17 8 12 9-5m-24 22h21" stroke="${css('dark')}" stroke-width="2"/><path d="M209 269v8m87-8v8" stroke="${css('dark')}" stroke-width="10" stroke-linecap="round"/><path d="m309 125 20 13-10 25-20-13Z" fill="${css('dark')}"/><circle cx="313" cy="139" r="2" fill="${css('light')}"/></g><path d="m349 239 11-30 11 30h-8v35h-6v-35Z" fill="${css('dark')}"/><path d="M46 43v16m-8-8h16m318 147v12m-6-6h12" stroke="${css('clay')}" stroke-width="2"/><path d="M69 292q139 15 288-1" stroke="${css('mid')}"/></svg>`;
  }
  const storageKey = 'maletapp.prototype.v1';
  let storageWarning = '';
  function validData(value) {
    return Array.isArray(value) && value.every(t => t && typeof t.id === 'string' && typeof t.destination === 'string' && typeof t.start === 'string' && typeof t.end === 'string' && typeof t.baggageId === 'string' && typeof t.completed === 'boolean' && Array.isArray(t.items) && t.items.every(i => i && typeof i.id === 'string' && typeof i.name === 'string' && typeof i.ready === 'boolean' && typeof i.notes === 'string' && categories.includes(i.category) && (i.quantity === null || Number.isFinite(i.quantity) && i.quantity > 0)));
  }
  function loadTrips() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) { const parsed = JSON.parse(saved); if (!validData(parsed)) throw Error('invalid'); return parsed; }
    } catch { storageWarning = 'No hemos podido recuperar los datos guardados. Mostramos los ejemplos; los cambios se conservarán en esta sesión.'; }
    return seed();
  }
  let trips = loadTrips();
  let tripFilter = 'active', itemFilter = 'all', listMode = 'flat', demoState = 'normal';
  let toastTimer, dialogContext, confirmAction, returnFocus;
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(trips)); return true; }
    catch { storageWarning = 'El navegador no permite guardar los cambios. Están disponibles durante esta sesión.'; return false; }
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').innerHTML = `${icon('check')}<span>${escape(message)}</span>`;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000);
  }
  function savedToast(message) { toast(persist() ? message : `${message} · Guardado sólo en esta sesión.`); }
  const counts = trip => { const total = trip.items.length, ready = trip.items.filter(i => i.ready).length; return { total, ready, pending:total-ready, percent:total ? Math.round(ready/total*100) : 0 }; };
  function status(trip) {
    if (trip.completed) return { type:'completed', label:'Finalizado', icon:'flag' };
    if (trip.end && trip.end < date(0)) return { type:'past', label:'Pasado', icon:'calendar' };
    const { total, ready } = counts(trip);
    if (total && ready === total) return { type:'ready', label:'Todo preparado', icon:'check' };
    if (total) return { type:'preparing', label:'En preparación', icon:'suitcase' };
    return { type:'upcoming', label:trip.start ? 'Próximo viaje' : 'Por planear', icon:'spark' };
  }
  const badge = trip => { const s = status(trip); return `<span class="badge ${s.type}">${icon(s.icon)}${s.label}</span>`; };
  const formatDate = str => new Intl.DateTimeFormat('es', {day:'numeric',month:'short',year:'numeric'}).format(new Date(`${str}T12:00:00`)).replaceAll('.', '');
  const dates = t => t.start && t.end ? `${formatDate(t.start)} — ${formatDate(t.end)}` : t.start ? `Desde el ${formatDate(t.start)}` : t.end ? `Hasta el ${formatDate(t.end)}` : 'Sin fechas · A tu ritmo';
  const progress = (value, label) => `<progress value="${value}" max="100" aria-label="${escape(label)}">${value}%</progress>`;
  const tripById = id => trips.find(t => t.id === id);
  function currentTrip() { try { return tripById(decodeURIComponent(location.hash.slice(6))); } catch { return undefined; } }
  function refreshView() {
    if(location.hash==='#design') renderDesign();
    else if(location.hash.startsWith('#trip/')) renderDetail();
    else renderTrips();
  }
  function tripMenu(t) {
    return `<details class="trip-menu"><summary class="icon-button" aria-label="Acciones de ${escape(t.destination)}">${icon('more')}</summary><div class="menu-panel"><button data-action="complete-trip" data-trip="${escape(t.id)}">${icon(t.completed ? 'back' : 'flag')}<span>${t.completed ? 'Volver a preparar' : 'Marcar como finalizado'}<small>Vista previa · Función futura</small></span></button><button class="destructive" data-action="delete-trip" data-trip="${escape(t.id)}">${icon('trash')}Eliminar viaje</button></div></details>`;
  }
  function tripCard(t) {
    const c = counts(t);
    return `<article class="trip-card ${t.completed ? 'completed-card' : ''}"><div class="postcard"><a href="#trip/${encodeURIComponent(t.id)}" aria-label="Abrir viaje a ${escape(t.destination)}"><div class="postcard-art">${landscape(t.art)}</div><div class="postcard-caption">${escape(t.caption || 'Una nueva historia por empezar.')}</div></a>${tripMenu(t)}</div><div class="trip-info">${badge(t)}<h2><a href="#trip/${encodeURIComponent(t.id)}">${escape(t.destination)}</a></h2><p class="date-line">${icon('calendar')}${escape(dates(t))}</p><div class="progress-meta"><span>${c.total ? `${c.ready} de ${c.total} items preparados` : 'Tu maleta, un lienzo en blanco'}</span><span>${c.percent}%</span></div>${progress(c.percent, `Preparación de ${t.destination}`)}<div class="card-bottom"><span class="small-note">${c.total ? c.pending ? `${c.pending} por preparar` : 'Todo en su sitio' : 'Empieza cuando quieras'}</span><a class="open-trip" href="#trip/${encodeURIComponent(t.id)}">Preparar maleta ${icon('arrow')}</a></div></div></article>`;
  }
  function emptyState(kind = 'trips', filtered = false) {
    const isItems = kind === 'items';
    return `<div class="empty"><div class="empty-art">${travelArt()}</div><h2>${filtered ? 'Nada por aquí, de momento' : isItems ? 'Tu maleta todavía está vacía' : 'Tu próxima aventura empieza aquí'}</h2><p>${filtered ? 'Prueba otro filtro para encontrar lo que buscas.' : isItems ? 'Empieza por lo imprescindible. Lo demás irá encontrando su sitio.' : 'Un destino, muchas posibilidades. Crea tu primer viaje y prepara lo que te acompañará.'}</p>${filtered ? `<button class="button secondary" data-action="${isItems ? 'reset-item-filter' : 'reset-trip-filter'}">${isItems ? 'Ver todos los items' : 'Ver viajes activos'}</button>` : `<button class="button" data-action="${isItems ? 'new-item' : 'new-trip'}">${icon('plus')}${isItems ? 'Añadir primer item' : 'Crear mi primer viaje'}</button>`}</div>`;
  }
  function renderTrips() {
    const active = trips.filter(t => !t.completed && status(t).type !== 'past');
    const past = trips.filter(t => !t.completed && status(t).type === 'past');
    const completed = trips.filter(t => t.completed);
    const visible = {active, past, completed}[tripFilter];
    $('#main').innerHTML = `<section class="hero" aria-labelledby="home-title"><div><div class="eyebrow"><span class="line"></span>El viaje empieza antes de salir</div><h1 id="home-title">Haz sitio para<br>la <em>aventura.</em></h1><p>Tus viajes en orden. Tu maleta, a punto.<br>Y la tranquilidad de no olvidar nada.</p><button class="button" data-action="new-trip">${icon('plus')}Nuevo viaje</button></div><div class="hero-art">${travelArt()}</div></section>${storageWarning ? `<div class="notice" role="status">${icon('info')}<p>${escape(storageWarning)}</p></div>` : ''}<section aria-label="Mis viajes"><div class="toolbar"><div class="tabs" aria-label="Filtrar viajes">${[['active','Activos',active.length],['past','Pasados',past.length],['completed','Finalizados',completed.length]].map(([key,label,count]) => `<button class="tab" data-action="trip-filter" data-filter="${key}" aria-pressed="${tripFilter===key}">${label}<span class="tab-count">${count}</span></button>`).join('')}</div><span class="small-note">Un destino. Una lista. Todo bajo control.</span></div>${tripFilter==='completed' ? `<div class="notice">${icon('flag')}<p><strong>Una mirada al futuro.</strong> Así se verán los viajes finalizados. Puedes reabrir el ejemplo desde su menú.</p></div>` : ''}${visible.length ? `<div class="trip-grid">${visible.map(tripCard).join('')}</div>` : emptyState('trips',trips.length>0)}<div class="little-reminder">${icon('leaf')}<p><span>Lleva lo que necesitas.</span> Deja espacio para lo que está por venir.</p></div></section>`;
  }
  function avatarClass(category) { return {'Documentación':'documentation','Ropa':'clothing','Salud':'health'}[category] || ''; }
  function itemRow(i, t) {
    return `<li class="item-row ${i.ready?'is-ready':''}"><label class="check-target"><input type="checkbox" data-action="toggle-item" data-item="${escape(i.id)}" data-trip="${escape(t.id)}" ${i.ready?'checked':''} aria-label="Marcar ${escape(i.name)} como ${i.ready?'pendiente':'preparado'}"><span class="sr-only">${escape(i.name)}</span></label><span class="item-avatar ${avatarClass(i.category)}">${icon(i.icon)}</span><div class="item-copy"><div class="item-name"><span>${escape(i.name)}</span>${i.quantity!==null?`<span class="quantity" aria-label="Cantidad: ${i.quantity}">× ${i.quantity}</span>`:''}</div>${i.notes?`<p class="item-note">${escape(i.notes)}</p>`:''}<span class="item-state">${i.ready?'Preparado':'Pendiente'}</span></div><div class="row-actions"><button class="icon-button" data-action="edit-item" data-trip="${escape(t.id)}" data-item="${escape(i.id)}" aria-label="Editar ${escape(i.name)}">${icon('edit')}</button><button class="icon-button delete-item" data-action="delete-item" data-trip="${escape(t.id)}" data-item="${escape(i.id)}" aria-label="Eliminar ${escape(i.name)}">${icon('trash')}</button></div></li>`;
  }
  function itemList(t) {
    const visible = t.items.filter(i => itemFilter==='all' || (itemFilter==='ready' ? i.ready : !i.ready));
    if (!t.items.length) return emptyState('items');
    if (!visible.length) return emptyState('items',true);
    if (listMode==='flat') return `<ul class="packing-list" aria-label="Items del viaje">${visible.map(i => itemRow(i,t)).join('')}</ul>`;
    return `<p class="small-note" style="margin-top:16px">Vista previa de categorías · Asignadas automáticamente por sugerencia.</p>${categories.map(category => {
      const group = visible.filter(i => i.category===category);
      if (!group.length) return '';
      const c = counts({items:t.items.filter(i=>i.category===category)});
      const heading = `<span>${escape(category)}</span><span class="category-progress">${c.ready}/${c.total} preparados${progress(c.percent, `Preparación de ${category}`)}</span>`;
      const list = `<ul class="packing-list" aria-label="${escape(category)}">${group.map(i=>itemRow(i,t)).join('')}</ul>`;
      return listMode==='collapsed' ? `<details class="category" data-category="${escape(category)}" open><summary>${icon('chevron')}${heading}</summary>${list}</details>` : `<section class="category"><h3 class="section-heading" style="font-size:14px;padding-block:16px">${heading}</h3>${list}</section>`;
    }).join('')}`;
  }
  function renderDetail() {
    const t = currentTrip();
    if (!t) { $('#main').innerHTML = `<a class="back-link" href="#trips">${icon('back')}Mis viajes</a><div class="empty"><h1>Este viaje no está aquí</h1><p>Puede que se haya eliminado o que el enlace no sea correcto.</p><a class="button" href="#trips">Volver a mis viajes</a></div>`; return; }
    const c = counts(t);
    const closed = $$('details.category:not([open])').map(el=>el.dataset.category);
    $('#main').innerHTML = `<a class="back-link" href="#trips">${icon('back')}Mis viajes</a><header class="detail-heading">${badge(t)}<h1>${escape(t.destination)}</h1><p class="date-line">${icon('calendar')}${escape(dates(t))}</p>${tripMenu(t)}</header>${t.completed ? `<div class="notice success">${icon('flag')}<p>Un viaje para el recuerdo. <strong>Variante futura:</strong> puedes volver a prepararlo desde el menú del viaje; tus items se conservarán.</p></div>` : ''}<div class="detail-layout"><aside class="packing-summary" aria-label="Resumen de preparación"><div class="summary-title"><span class="eyebrow">Tu equipaje, a punto</span>${icon('suitcase')}</div><div class="summary-number">${c.percent}<span>%</span></div>${progress(c.percent,'Progreso total del equipaje')}<div class="summary-counts"><p><strong>${c.ready}</strong>preparados</p><p><strong>${c.pending}</strong>pendientes</p></div><p class="summary-message">${c.total && !c.pending ? 'Todo listo. ¡Buen viaje!' : c.ready ? 'Poco a poco, ya casi estás.' : 'Todo empieza con el primer item.'}</p><div class="summary-art">${travelArt()}<p>Lo importante va contigo.</p></div></aside><section class="packing-main" aria-labelledby="packing-title"><div class="section-heading"><div><h2 id="packing-title">Lo que viene contigo</h2><p>Marca cada item cuando esté en tu maleta.</p></div><button class="button" data-action="new-item">${icon('plus')}Añadir item</button></div><div class="list-controls"><div class="tabs" aria-label="Filtrar items">${[['all','Todos',c.total],['pending','Pendientes',c.pending],['ready','Preparados',c.ready]].map(([key,label,count])=>`<button class="tab" data-action="item-filter" data-filter="${key}" aria-pressed="${key===itemFilter}">${label}<span class="tab-count">${count}</span></button>`).join('')}</div><label class="view-select"><span class="sr-only">Vista de items</span><select id="list-mode"><option value="flat" ${listMode==='flat'?'selected':''}>Lista simple</option><option value="grouped" ${listMode==='grouped'?'selected':''}>Categorías · Futuro</option><option value="collapsed" ${listMode==='collapsed'?'selected':''}>Plegables · Futuro</option></select></label></div>${itemList(t)}</section></div><div class="mobile-action"><button class="button" data-action="new-item">${icon('plus')}Añadir item</button></div>`;
    $$('details.category').forEach(el=> { if (closed.includes(el.dataset.category)) el.open=false; });
  }
  function field({name,label,type='text',value='',placeholder='',optional=false,hint='',max=''}) {
    return `<div class="field"><label for="${name}">${label}${optional?' <span class="optional">· Opcional</span>':''}</label><input id="${name}" name="${name}" type="${type}" value="${escape(value)}" placeholder="${escape(placeholder)}" ${optional?'':'required'} ${max?`maxlength="${max}"`:''} ${type==='number'?'min="1" step="1" inputmode="numeric"':''} aria-describedby="${name}-error${hint?` ${name}-hint`:''}"><span id="${name}-error" class="field-error"></span>${hint?`<span class="field-hint" id="${name}-hint">${hint}</span>`:''}</div>`;
  }
  function showForm(mode, t, i) {
    returnFocus = document.activeElement;
    dialogContext = {mode, tripId:t?.id, itemId:i?.id};
    const isTrip = mode==='trip', edit = mode==='edit';
    const title = isTrip ? '¿Adónde nos vamos?' : edit ? 'Cada detalle cuenta' : 'Un hueco en tu maleta';
    $('#form-dialog').innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><div class="dialog-inner"><div class="dialog-heading"><div><div class="eyebrow">${isTrip?'Nuevo viaje':edit?'Editar item':'Añadir item'}</div><h2 id="dialog-title">${title}</h2></div><button class="icon-button" data-action="close-form" aria-label="Cerrar formulario">${icon('close')}</button></div><p class="dialog-intro">${isTrip?'Empieza por el destino. Las fechas pueden esperar.':`Prepara tu viaje a ${escape(t.destination)}, una cosa a la vez.`}</p><form id="editor-form" novalidate>${isTrip ? `${field({name:'destination',label:'Destino',placeholder:'Por ejemplo, Lisboa',max:100})}<div class="date-fields">${field({name:'start',label:'Fecha de inicio',type:'date',optional:true})}${field({name:'end',label:'Fecha de fin',type:'date',optional:true})}</div>` : `${field({name:'name',label:'Nombre del item',value:i?.name,placeholder:'¿Qué necesitas llevar?',max:120})}<div class="suggestions" id="suggestions" aria-label="Items frecuentes"></div><div class="preset-preview" id="preset-preview" hidden></div>${field({name:'quantity',label:'Cantidad',type:'number',value:i?.quantity ?? '',optional:true,hint:'Si la indicas, usa un número entero mayor que cero.'})}<div class="field"><label for="notes">Notas <span class="optional">· Opcional</span></label><textarea id="notes" name="notes" maxlength="1000" placeholder="Por ejemplo, llevar dos pares extra">${escape(i?.notes || '')}</textarea></div>${edit?`<label class="edit-ready"><input id="ready" name="ready" type="checkbox" ${i.ready?'checked':''}>Ya está preparado</label>`:''}` }<div class="dialog-actions"><button class="button secondary" type="button" data-action="close-form">Cancelar</button><button class="button" type="submit">${isTrip?'Crear viaje':edit?'Guardar cambios':'Añadir item'}${icon(isTrip?'arrow':'check')}</button></div></form></div>`;
    if (!isTrip) renderSuggestions();
    $('#form-dialog').showModal();
    $(isTrip?'#destination':'#name').focus();
  }
  function renderSuggestions() {
    const query = $('#name').value.trim().toLocaleLowerCase('es');
    const matches = presets.filter(p => p.name.toLocaleLowerCase('es').includes(query)).slice(0, query ? 5 : 4);
    $('#suggestions').innerHTML = matches.length ? `<span class="suggestion-label">${query?'Quizá buscas…':'Empieza por lo habitual'}</span>${matches.map(p=>`<button type="button" class="suggestion" data-action="suggest" data-name="${escape(p.name)}">${icon(p.icon)}${escape(p.name)}</button>`).join('')}` : '<span class="suggestion-label">Tu item es único. Puedes añadirlo tal como lo has escrito.</span>';
    const preset = presets.find(p=>p.name.toLocaleLowerCase('es')===query);
    $('#preset-preview').hidden = !preset;
    $('#preset-preview').innerHTML = preset ? `${icon(preset.icon)}<span>${preset.help || `Icono asociado · ${preset.category}`}</span>` : '';
  }
  function closeForm() { $('#form-dialog').close(); if (returnFocus?.isConnected) returnFocus.focus(); }
  function error(name, message) { $(`#${name}`).setAttribute('aria-invalid','true'); $(`#${name}-error`).textContent = message; }
  function submitForm(event) {
    event.preventDefault();
    const form = event.target;
    if (form.id!=='editor-form') return;
    $$('[aria-invalid]',form).forEach(el=>el.removeAttribute('aria-invalid'));
    $$('.field-error',form).forEach(el=>el.textContent='');
    const values = new FormData(form);
    if (dialogContext.mode==='trip') {
      const destination = values.get('destination').trim(), start=values.get('start'), end=values.get('end');
      if (!destination) error('destination','Indica un destino para tu viaje.');
      if (start && end && start>end) error('end','La fecha de fin debe ser igual o posterior a la de inicio.');
      if ($('[aria-invalid="true"]',form)) { $('[aria-invalid="true"]',form).focus(); return; }
      const id=uid();
      trips.unshift({id,destination,start,end,art:'mountain',caption:'Una nueva historia por empezar.',completed:false,baggageId:`bag-${id}`,items:[]});
      closeForm(); savedToast('Tu viaje está creado. ¡Empieza la aventura!');
      itemFilter='all'; location.hash=`trip/${id}`;
    } else {
      const name = values.get('name').trim(), rawQuantity = values.get('quantity'), quantity = rawQuantity===''?null:Number(rawQuantity);
      if (!name) error('name','Escribe el nombre de lo que vas a llevar.');
      if (quantity!==null && (!Number.isSafeInteger(quantity) || quantity<=0)) error('quantity','La cantidad debe ser un número entero mayor que cero.');
      if ($('#quantity').validity.badInput) error('quantity','Escribe una cantidad válida.');
      if ($('[aria-invalid="true"]',form)) { $('[aria-invalid="true"]',form).focus(); return; }
      const t=tripById(dialogContext.tripId);
      if (!t) { closeForm(); toast('Este viaje ya no está disponible.'); route(); return; }
      const preset = presets.find(p=>p.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'));
      const edit = dialogContext.mode==='edit';
      const id=edit?dialogContext.itemId:uid();
      const updated={id,name,quantity,notes:values.get('notes').trim(),ready:edit?values.has('ready'):false,category:preset?.category||'Otros',icon:preset?.icon||'tag',baggageId:t.baggageId};
      if (edit) t.items=t.items.map(i=>i.id===id?updated:i); else t.items.push(updated);
      closeForm(); itemFilter='all'; savedToast(edit?'Item actualizado.':'Item añadido a tu maleta.'); renderDetail();
      $(`[data-action="${edit?'edit-item':'toggle-item'}"][data-item="${CSS.escape(id)}"]`)?.focus();
    }
  }
  function confirm({title,description,label='Eliminar',action,danger=true}) {
    returnFocus=document.activeElement;
    confirmAction=action;
    $('#confirm-dialog').innerHTML=`<div class="sheet-handle" aria-hidden="true"></div><div class="dialog-inner"><span class="danger-icon">${icon(danger?'trash':'flag')}</span><h2 id="confirm-title">${escape(title)}</h2><p id="confirm-description">${escape(description)}</p><div class="dialog-actions"><button class="button secondary" data-action="cancel-confirm" autofocus>Cancelar</button><button class="button ${danger?'danger':''}" data-action="accept-confirm">${escape(label)}</button></div></div>`;
    $('#confirm-dialog').setAttribute('aria-describedby','confirm-description');
    $('#confirm-dialog').showModal();
    $('[data-action="cancel-confirm"]',$('#confirm-dialog')).focus();
  }
  function cancelConfirm() { $('#confirm-dialog').close(); confirmAction=null; if(returnFocus?.isConnected) returnFocus.focus(); }
  function rerenderKeepingFocus(render, selector) { render(); $(selector)?.focus({preventScroll:true}); }
  function setTheme(theme) {
    document.documentElement.dataset.theme=theme;
    $('#theme-toggle').innerHTML=icon(theme==='night'?'sun':'moon');
    $('#theme-toggle').setAttribute('aria-label',`Cambiar a tema ${theme==='night'?'claro':'nocturno'}`);
    try { localStorage.setItem('maletapp.theme',theme); } catch { /* El tema sigue funcionando en memoria. */ }
    if(location.hash==='#design') updateSwatchValues();
  }
  function route() {
    const hash=location.hash || '#trips';
    $$('.site-header nav a').forEach(a=> { if(a.dataset.nav===(hash==='#design'?'design':'trips')) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    if ($('#form-dialog').open) closeForm();
    if ($('#confirm-dialog').open) cancelConfirm();
    if (hash==='#design') { renderDesign(); document.title='Guía de diseño · Maletapp'; }
    else if(hash.startsWith('#trip/')) { itemFilter='all'; renderDetail(); document.title=`${currentTrip()?.destination || 'Viaje'} · Maletapp`; }
    else { renderTrips(); document.title='Mis viajes · Maletapp'; }
    $('#main').dataset.route=hash;
    window.scrollTo(0,0);
    $('#main').focus({preventScroll:true});
  }
  document.addEventListener('click',event=> {
    const button=event.target.closest('[data-action]');
    if(!button) return;
    const action=button.dataset.action, t=tripById(button.dataset.trip), i=t?.items.find(i=>i.id===button.dataset.item);
    if (action==='new-trip') showForm('trip');
    if (action==='new-item') { const trip=currentTrip(); if(trip) showForm('new',trip); else showForm('new',trips.find(t=>!t.completed)||trips[0]||{id:'demo',destination:'un nuevo destino'}); }
    if (action==='edit-item' && i) showForm('edit',t,i);
    if (action==='close-form') closeForm();
    if (action==='suggest') { $('#name').value=button.dataset.name; renderSuggestions(); $('#name').focus(); }
    if (action==='trip-filter') { tripFilter=button.dataset.filter; rerenderKeepingFocus(renderTrips,`[data-action="trip-filter"][data-filter="${tripFilter}"]`); }
    if (action==='item-filter') { itemFilter=button.dataset.filter; rerenderKeepingFocus(renderDetail,`[data-action="item-filter"][data-filter="${itemFilter}"]`); }
    if (action==='reset-item-filter') { itemFilter='all'; rerenderKeepingFocus(renderDetail,'[data-action="item-filter"]'); }
    if (action==='reset-trip-filter') { tripFilter='active'; rerenderKeepingFocus(renderTrips,'[data-action="trip-filter"]'); }
    if (action==='delete-trip' && t) confirm({ title:'¿Eliminar este viaje?', description:`Se eliminará el viaje a ${t.destination}, sus ${t.items.length} items y todos sus datos asociados. Esta acción no se puede deshacer.`, label:'Eliminar viaje', action:()=>{trips=trips.filter(x=>x.id!==t.id); savedToast('Viaje eliminado.'); if(location.hash.startsWith('#trip/')) location.hash='trips'; else {refreshView(); $('#main').focus();}} });
    if (action==='delete-item' && i) confirm({title:'¿Sacar este item de la lista?',description:`Se eliminará «${i.name}» y sus notas de tu viaje a ${t.destination}. Esta acción no se puede deshacer.`,label:'Eliminar item',action:()=>{t.items=t.items.filter(x=>x.id!==i.id);savedToast('Item eliminado.');renderDetail();$('#packing-title').setAttribute('tabindex','-1');$('#packing-title').focus();}});
    if (action==='complete-trip' && t) confirm({title:t.completed?'¿Volver a preparar este viaje?':'¿Guardar este viaje como finalizado?',description:t.completed?'Vista previa de una función futura. Se quitará el estado finalizado y se conservarán los items y sus marcas. El viaje aparecerá en Activos o, si sus fechas ya pasaron, en Pasados.':'Vista previa de una función futura. El viaje aparecerá en Finalizados y conservará todos sus items. Podrás volver a prepararlo desde su menú.',label:t.completed?'Volver a preparar':'Marcar como finalizado',danger:false,action:()=>{t.completed=!t.completed;savedToast(t.completed?'Vista previa: viaje finalizado.':'Vista previa: viaje reabierto.');refreshView();$('#main').focus();}});
    if (action==='cancel-confirm') cancelConfirm();
    if (action==='accept-confirm') { const run=confirmAction; confirmAction=null;$('#confirm-dialog').close();run?.(); }
    if (action==='demo-toast') toast('Todo en su sitio. Cambios guardados.');
    if (action==='demo-state') {demoState=button.dataset.state;renderStateDemo();$$('[data-action="demo-state"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===demoState)));}
    if (action==='demo-retry') {demoState='normal';renderStateDemo();$$('[data-action="demo-state"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===demoState)));$('[data-action="demo-state"]').focus();}
    if (action==='demo-confirm') confirm({title:'¿Eliminar este item?',description:'Este es un ejemplo de confirmación. Tus viajes no se modificarán.',label:'Eliminar ejemplo',action:()=>{toast('Ejemplo de confirmación completado.');returnFocus?.focus();}});
    if (action==='reset-data') confirm({title:'¿Restaurar los viajes de ejemplo?',description:'Se eliminarán los viajes y cambios guardados en este navegador y volverán los datos iniciales del prototipo.',label:'Restaurar ejemplos',action:()=>{trips=seed();storageWarning='';savedToast('Viajes de ejemplo restaurados.');tripFilter='active';location.hash='trips';}});
    if (action==='design-anchor') {event.preventDefault();const section=$(`#${button.dataset.target}`);section.setAttribute('tabindex','-1');section.focus({preventScroll:true});section.scrollIntoView({behavior:'smooth'});}
  });
  document.addEventListener('change',event=> {
    const target=event.target;
    if (target.dataset.action==='toggle-item') {
      const t=tripById(target.dataset.trip), i=t?.items.find(i=>i.id===target.dataset.item);
      if(!i) return;
      i.ready=target.checked;
      const message=`${i.name}, ${i.ready?'preparado':'pendiente'}. ${counts(t).ready} de ${t.items.length} items preparados.`;
      const stored=persist(); renderDetail();
      ($(`[data-action="toggle-item"][data-item="${CSS.escape(i.id)}"]`) || $('[data-action="item-filter"][aria-pressed="true"]'))?.focus({preventScroll:true});
      $('#announcer').textContent=message;
      if(!stored) toast('Cambio guardado sólo durante esta sesión.');
      else if(counts(t).pending===0) toast('¡Todo preparado! Tu próxima parada: disfrutar.');
    }
    if(target.id==='list-mode') {listMode=target.value;rerenderKeepingFocus(renderDetail,'#list-mode');}
  });
  document.addEventListener('input',event=>{if(event.target.id==='name')renderSuggestions();});
  document.addEventListener('submit',submitForm);
  document.addEventListener('click',event=> {$$('.trip-menu[open], .menu-demo[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});});
  document.addEventListener('keydown',event=> {if(event.key==='Escape')$$('.trip-menu[open], .menu-demo[open]').forEach(menu=>{menu.open=false;$('summary',menu).focus();});});
  document.addEventListener('keydown',event=> {
    if(event.key!=='Tab') return;
    const modal=$('#confirm-dialog').open ? $('#confirm-dialog') : $('#form-dialog').open ? $('#form-dialog') : null;
    if(!modal) return;
    const controls=$$('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',modal).filter(el=>el.getClientRects().length);
    const first=controls[0], last=controls.at(-1);
    if(event.shiftKey && document.activeElement===first) {event.preventDefault();last?.focus();}
    else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();}
    else if(!modal.contains(document.activeElement)) {event.preventDefault();first?.focus();}
  });
  $('#form-dialog').addEventListener('cancel',()=>{if(returnFocus?.isConnected)returnFocus.focus();});
  $('#confirm-dialog').addEventListener('cancel',()=>{confirmAction=null;if(returnFocus?.isConnected)returnFocus.focus();});
  $('#theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='night'?'light':'night'));
  window.addEventListener('hashchange',route);
  $('#brand-icon').innerHTML=icon('suitcase');
  let initialTheme='light';try{initialTheme=localStorage.getItem('maletapp.theme')==='night'?'night':'light';}catch{}
  setTheme(initialTheme);

  // La guía utiliza los mismos componentes y tokens que las vistas del producto.
  const swatchTokens=[['background','Papel'],['surface','Hoja'],['text','Tinta'],['muted','Lápiz'],['primary','Terracota'],['success','Oliva'],['warning','Ocre'],['danger','Alerta'],['border','Divisor'],['focus','Foco']];
  function renderDesign() {
    $('#main').innerHTML=`<header class="design-header"><div class="eyebrow"><span class="line"></span>Cuaderno de diseño · Versión 01</div><h1>Con los pies en la tierra.<br>La cabeza, de viaje.</h1><p>Un lenguaje visual para preparar la maleta con calma. Cálido, práctico y con ese pequeño entusiasmo que aparece antes de salir.</p></header><nav class="design-index" aria-label="Secciones de la guía">${[['principles','La idea'],['colors','Color'],['type','Tipografía y ritmo'],['components','Componentes'],['states','Estados'],['future','Lo que viene']].map(([id,label])=>`<a href="#design" data-action="design-anchor" data-target="ds-${id}">${label}</a>`).join('')}</nav>
    <section class="design-section" id="ds-principles"><div class="eyebrow">01 · Dirección artística</div><h2>Una maleta, no un panel de control.</h2><p>La referencia es un cuaderno de viaje: postales ilustradas, anotaciones a lápiz, una lista sobre papel y un billete con lo esencial. La composición parte de esos objetos y después se convierte en componentes.</p><div class="principles">${[
      ['Papel y tinta','El fondo marfil aporta continuidad. Verde oscuro para leer, terracota para actuar. Las superficies sólo aparecen cuando agrupan un objeto: postal, formulario o resumen.'],
      ['Una voz editorial','La serif humanista cuenta el destino y la aventura. La sans del sistema mantiene los controles y las listas nítidos. Sin fuentes remotas: la aplicación funciona sin conexión.'],
      ['Espacio para respirar','Ritmo de 4 px, listas de al menos 88 px y controles de 44–48 px. El contenido cotidiano es compacto; las cabeceras dejan espacio al entusiasmo.'],
      ['Bordes con propósito','Divisores finos separan items. Radios pequeños recuerdan papel recortado; los grandes identifican paneles móviles. Sombras reservadas a elementos flotantes.'],
      ['Iconos que acompañan','SVG propios sobre una retícula de 24 px y trazo de 1,65 px. Los pictogramas sugieren objetos, nunca sustituyen labels. Las ilustraciones son postales vectoriales.'],
      ['Movimiento tranquilo','140 ms para controles, 240 ms para cambios de superficie. Sin celebraciones que interrumpan: un mensaje breve cuando la maleta está lista. Se respeta movimiento reducido.'],
    ].map(([title,text],n)=>`<article class="principle"><span class="number">0${n+1}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div></section>
    <section class="design-section" id="ds-colors"><div class="eyebrow">02 · Tokens semánticos</div><h2>Los colores del camino.</h2><p>Los componentes consumen variables CSS, nunca valores de color directos. Cambia al tema nocturno desde la cabecera: la estructura se mantiene y los tokens cambian de valor.</p><div class="swatches">${swatchTokens.map(([token,label])=>`<div class="swatch"><div class="swatch-color" style="background:var(--color-${token})"></div><strong>${label}</strong><code>--color-${token}</code><code data-swatch="${token}"></code></div>`).join('')}</div><p style="margin-top:24px">Las variantes <code>primary-soft</code>, <code>success-soft</code>, <code>warning-soft</code> y <code>danger-soft</code> crean superficies de apoyo. Las ilustraciones tienen su propia familia de tokens semánticos. <code>color-on-primary</code> mantiene legible el texto de los botones en ambos temas.</p></section>
    <section class="design-section" id="ds-type"><div class="eyebrow">03 · Tipografía y composición</div><h2>Lo expresivo arriba. Lo práctico, a mano.</h2><div class="spec-grid"><div><div class="sample-display">El mundo cabe<br>en una maleta.</div><code>--font-display · Iowan / Palatino / Georgia<br>Hero: clamp(2.8rem, 6vw, 4.8rem) · peso 400</code></div><div><div class="sample-body">Pasaporte. Cargador. Ese libro.</div><p>Texto de interfaz en la sans nativa del dispositivo, con interlineado 1,55. Jerarquía: 12, 14, 16, 18, 24 y 32 px; controles de formulario a 16 px para evitar zoom en móvil.</p><code>--font-body · system sans<br>--font-mono · documentación de tokens</code></div><div><h3>Espaciado · base de 4 px</h3><div class="token-lines">${[4,8,12,16,24,32,48,64].map((v,i)=>`<div class="token-line"><code>--space-${i+1} · ${v}px</code><span class="space-bar" style="width:${v}px"></span></div>`).join('')}</div></div><div><h3>Radios, bordes y sombras</h3><div class="component-row">${[['sm',6],['md',12],['lg',20]].map(([key,v])=>`<div class="radius-sample" style="border-radius:var(--radius-${key})"><code>${key} · ${v}px</code></div>`).join('')}</div><p><code>--border-thin</code>: 1 px para separar.<br><code>--shadow-sm</code>: elevación discreta de postales al pasar el puntero.<br><code>--shadow-overlay</code>: modales, menús y toasts.<br><code>--radius-pill</code>: barras de progreso, no todos los botones.</p></div><div><h3>Responsive</h3><p><strong>Base, 320–599 px:</strong> una columna, formularios inferiores y acción de añadir fija en el detalle.<br><strong>600 px:</strong> dos postales, cabecera horizontal y modal centrado.<br><strong>900 px:</strong> tres postales y resumen lateral fijo al hacer scroll.<br><strong>1200 px:</strong> mayor aire y ancho máximo de 1160 px. Validación objetivo: 390 × 844 y 1440 px.</p></div><div><h3>Foco y movimiento</h3><p>Foco de 3 px con separación de 4 px. Controles nativos para teclado; el modal encierra el foco y Escape lo cierra. Se devuelve el foco al control de origen o al contexto actualizado.</p><div class="component-row"><button class="button secondary" style="outline:var(--focus-ring);outline-offset:4px" data-action="demo-toast">Ejemplo de foco</button></div><p><code>prefers-reduced-motion: reduce</code> desactiva animaciones, transiciones y desplazamiento suave.</p></div></div></section>
    <section class="design-section" id="ds-components"><div class="eyebrow">04 · Piezas compartidas</div><h2>Un sistema que se usa.</h2><p>La cabecera, la navegación, las postales y la lista del producto son los componentes de referencia. Estas muestras reutilizan sus estilos y comportamientos.</p><div class="component-block"><h3>Acciones y jerarquía</h3><div class="component-row"><button class="button" data-action="new-trip">${icon('plus')}Nuevo viaje</button><button class="button secondary" data-action="demo-toast">Secundario</button><button class="button danger" data-action="demo-confirm">${icon('trash')}Eliminar</button><button class="button text" data-action="demo-toast">Botón de texto ${icon('arrow')}</button><button class="button" disabled>Deshabilitado</button><a href="#trips">Enlace a mis viajes</a></div></div><div class="component-block"><h3>Formularios</h3><div class="spec-grid"><div>${field({name:'demo-destination',label:'Destino',value:'Lisboa'})}${field({name:'demo-date',label:'Fecha de inicio',type:'date',optional:true})}</div><div>${field({name:'demo-quantity',label:'Cantidad',type:'number',optional:true,value:2})}<div class="field"><label for="demo-notes">Notas <span class="optional">· Opcional</span></label><textarea id="demo-notes" placeholder="Llevar dos pares extra"></textarea></div></div></div><label class="edit-ready"><input type="checkbox" checked>Item preparado</label><p class="small-note">Los campos obligatorios se identifican por contraste con los opcionales. La cantidad cuenta unidades; el progreso cuenta items, no unidades.</p></div><div class="component-block"><h3>Estados del viaje</h3><div class="component-row">${[{items:[],start:date(4),end:'',completed:false},{items:[{ready:false}],start:'',end:'',completed:false},{items:[{ready:true}],start:'',end:'',completed:false},{items:[],start:'',end:date(-1),completed:false},{items:[],start:'',end:'',completed:true}].map(badge).join('')}<span class="future-tag">Finalizado: función futura</span></div></div><div class="component-block"><h3>Lista y progreso</h3><div class="demo-box"><div class="progress-meta" style="margin-top:0"><span>2 de 4 items preparados</span><span>50%</span></div>${progress(50,'Ejemplo de progreso')}<ul class="packing-list"><li class="item-row"><label class="check-target"><input type="checkbox" aria-label="Ejemplo: marcar pasaporte como preparado"></label><span class="item-avatar documentation">${icon('passport')}</span><div class="item-copy"><div class="item-name">Pasaporte <span class="quantity">× 1</span></div><p class="item-note">En el bolsillo pequeño de la mochila</p><span class="item-state">Muestra de componente · Sin datos asociados</span></div></li></ul></div></div><div class="component-block"><h3>Capas e interacciones</h3><div class="component-row"><button class="button secondary" data-action="new-trip">Abrir modal / bottom sheet</button><button class="button secondary" data-action="demo-confirm">Ver confirmación</button><button class="button secondary" data-action="demo-toast">Mostrar toast</button><div class="demo-box"><details class="menu-demo"><summary class="icon-button" aria-label="Menú contextual de ejemplo">${icon('more')}</summary><div class="menu-panel"><button data-action="demo-toast">${icon('edit')}Acción de ejemplo</button><button class="destructive" data-action="demo-confirm">${icon('trash')}Eliminar ejemplo</button></div></details></div></div><p class="small-note">El mismo formulario se convierte en panel inferior móvil y modal de escritorio. Los menús se abren con Enter y se cierran con Escape o pulsando fuera.</p></div></section>
    <section class="design-section" id="ds-states"><div class="eyebrow">05 · Todos los momentos</div><h2>También cuando algo falta.</h2><p>Explora los estados de la lista. Son simulaciones de presentación; no necesitan una API y no modifican tus viajes.</p><div class="state-buttons" aria-label="Simular estado de la lista">${[['normal','Con datos'],['empty','Vacío'],['loading','Cargando'],['error','Error']].map(([key,label])=>`<button class="button secondary" data-action="demo-state" data-state="${key}" aria-pressed="${key===demoState}">${label}</button>`).join('')}</div><div id="state-demo"></div><div class="spec-grid" style="margin-top:32px"><div><h3>Error junto al campo</h3><div class="field"><label for="demo-invalid">Destino</label><input id="demo-invalid" aria-invalid="true" aria-describedby="demo-invalid-error" placeholder="¿Adónde nos vamos?"><span class="field-error" id="demo-invalid-error">Indica un destino para tu viaje.</span></div></div><div><h3>Éxito sin interrupciones</h3><div class="notice success">${icon('check')}Todo preparado. ¡Buen viaje!</div><p>Los cambios se anuncian con una región viva. Los toasts informan sin mover el foco y la barra siempre incluye un valor numérico.</p></div></div></section>
    <section class="design-section" id="ds-future"><div class="eyebrow">06 · Crecer sin complicar</div><h2>Lo que vendrá en la maleta.</h2><div class="future-list"><article><h3>Viajes finalizados <span class="future-tag">Futuro</span></h3><p>Badge, filtro y acciones reversibles de simulación. Finalizar nunca es necesario para preparar el equipaje. Al reabrir se conservan los items y su estado.</p></article><article><h3>Categorías progresivas <span class="future-tag">Futuro</span></h3><p>Lista plana por defecto. En el detalle, el selector permite probar agrupaciones y secciones plegables con conteo y progreso. El catálogo asigna categorías sin introducir otro campo obligatorio.</p></article><article><h3>Un catálogo extensible</h3><p>Nombres habituales, SVG, color semántico y ayuda opcional. Las sugerencias ya funcionan; un item libre usa el icono neutro y «Otros». Equipajes múltiples y selección manual de categoría quedan fuera del MVP.</p></article></div><div class="component-block"><h3>Las siete categorías</h3><div class="component-row">${categories.map(c=>`<span class="badge">${c}</span>`).join('')}</div></div><div class="catalog">${presets.map(p=>`<div class="catalog-item"><span class="item-avatar ${avatarClass(p.category)}">${icon(p.icon)}</span><span>${p.name}<small>${p.category}</small></span></div>`).join('')}</div><div class="component-block"><h3>Decisiones de experiencia</h3><p>El destino es suficiente para empezar. La checklist presenta un control amplio a la izquierda, las notas junto al nombre y acciones secundarias al final. El progreso responde a cada marca sin ordenar de nuevo la lista. Cancelar un formulario no modifica datos. El equipaje por defecto se asigna internamente y no aparece como una decisión adicional.</p></div><div class="notice">${icon('info')}<p>Prototipo con datos locales. No hay cuentas, sincronización, API ni integración con el backend. Los ejemplos usan fechas relativas al día de inicio. Puedes recuperar el escenario inicial en cualquier momento.</p></div><button class="button secondary" data-action="reset-data">Restaurar datos de ejemplo</button></section>`;
    updateSwatchValues();renderStateDemo();
  }
  function updateSwatchValues() {const styles=getComputedStyle(document.documentElement);$$('[data-swatch]').forEach(el=>el.textContent=styles.getPropertyValue(`--color-${el.dataset.swatch}`).trim());}
  function renderStateDemo() {
    const node=$('#state-demo');if(!node)return;
    node.removeAttribute('aria-busy');
    if(demoState==='loading') {node.setAttribute('aria-busy','true');node.innerHTML=`<span role="status" class="sr-only">Cargando viajes de ejemplo</span><div class="trip-grid" aria-hidden="true">${Array.from({length:3},()=>'<div><div class="skeleton skeleton-art"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>').join('')}</div>`;}
    else if(demoState==='empty') node.innerHTML=emptyState();
    else if(demoState==='error') node.innerHTML=`<div class="notice error" role="alert">${icon('warning')}<div><h3>No hemos podido cargar tus viajes</h3><p style="margin-block:8px 16px">Tus planes siguen a salvo. Vuelve a intentarlo dentro de un momento.</p><button class="button secondary" data-action="demo-retry">Volver a intentar</button></div></div>`;
    else {const example=trips[0];node.innerHTML=example?`<div class="trip-grid">${tripCard(example)}</div>`:emptyState();}
  }
  route();
})();
