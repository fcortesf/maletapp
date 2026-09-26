/* Catálogo extensible: no impone una categoría ni un equipaje al usuario. */
window.MaletappData = (() => {
  const categories = ['Documentación', 'Ropa', 'Higiene', 'Electrónica', 'Salud', 'Accesorios', 'Otros'];
  const presets = [
    { name: 'Pasaporte', category: 'Documentación', icon: 'passport', help: 'Comprueba que esté en vigor.' },
    { name: 'DNI', category: 'Documentación', icon: 'id', help: 'A mano, por si lo necesitas.' },
    { name: 'Cargador', category: 'Electrónica', icon: 'plug' },
    { name: 'Cepillo de dientes', category: 'Higiene', icon: 'brush' },
    { name: 'Camiseta', category: 'Ropa', icon: 'shirt' },
    { name: 'Pantalón', category: 'Ropa', icon: 'pants' },
    { name: 'Medicamentos', category: 'Salud', icon: 'health', help: 'Recuerda tus recetas, si las necesitas.' },
    { name: 'Auriculares', category: 'Electrónica', icon: 'headphones' },
    { name: 'Adaptador de corriente', category: 'Electrónica', icon: 'plug' },
    { name: 'Gafas de sol', category: 'Accesorios', icon: 'glasses' },
  ];
  const date = offset => {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const item = (id, name, ready, quantity = null, notes = '') => {
    const preset = presets.find(p => p.name === name);
    return { id, name, ready, quantity, notes, category: preset?.category || 'Otros', icon: preset?.icon || 'tag' };
  };
  function seed() {
    const trips = [
      { id: 'lisboa', destination: 'Lisboa', start: date(12), end: date(16), art: 'city', caption: 'Calles nuevas. Sin prisa.', completed: false,
        items: [item('l1','Pasaporte',true,null,'En el bolsillo pequeño de la mochila'), item('l2','Camiseta',true,4), item('l3','Pantalón',false,2), item('l4','Cepillo de dientes',false), item('l5','Cargador',true), item('l6','Gafas de sol',false), item('l7','Auriculares',true), item('l8','Zapatillas cómodas',false,1,'Para perderse por Alfama')] },
      { id: 'dolomitas', destination: 'Dolomitas', start: date(35), end: date(42), art: 'mountain', caption: 'Un poco más cerca del cielo.', completed: false, items: [] },
      { id: 'escapada', destination: 'Una escapada al mar', start: '', end: '', art: 'sea', caption: 'El plan es no tener plan.', completed: false, items: [item('e1','Gafas de sol',false),item('e2','Libro',false,null,'Ese que tengo a medias')] },
      { id: 'copenhague', destination: 'Copenhague', start: date(-50), end: date(-46), art: 'city', caption: 'Pequeñas cosas, buenos recuerdos.', completed: false, items: [item('c1','DNI',true),item('c2','Cargador',true)] },
      { id: 'menorca', destination: 'Menorca', start: date(-90), end: date(-83), art: 'sea', caption: 'Sal en la piel, calma en la maleta.', completed: true, items: [item('m1','Gafas de sol',true), item('m2','Camiseta',true,3)] },
    ];
    return trips.map(t => ({...t, baggageId: `bag-${t.id}`, items: t.items.map(i => ({...i, baggageId:`bag-${t.id}`}))}));
  }
  return { categories, presets, seed, date };
})();
