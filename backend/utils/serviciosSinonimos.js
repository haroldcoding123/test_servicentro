const OFICIOS = {
  carpinteria: ['carpinteria', 'carpintero', 'madera', 'mueble', 'ebanisteria', 'ebanista'],
  plomeria: ['plomeria', 'plomero', 'fontaneria', 'fontanero', 'tubo', 'tuberia', 'fuga', 'cañeria', 'cañeria', 'grifo', 'lavabo'],
  soldadura: ['soldadura', 'soldador', 'metal', 'estructura', 'weld', 'soldar'],
  albañileria: ['albañileria', 'albañil', 'cemento', 'ladrillo', 'mamposteria', 'muros'],
  cerrajeria: ['cerrajeria', 'cerrajero', 'cerradura', 'llave', 'candado', 'puerta'],
  electricidad: ['electricidad', 'electricista', 'cable', 'corriente', 'lampara', 'toma', 'enchufe'],
  ingenieria: ['ingenieria', 'ingeniero', 'estructura', 'proyecto', 'diseño', 'planos'],
  pintura: ['pintura', 'pintor', 'pared', 'revestimiento', 'mural', 'acabado'],
  limpieza: ['limpieza', 'limpiador', 'hogar', 'aseo', 'orden', 'sanitizacion'],
  mecanica: ['mecanica', 'mecanico', 'motor', 'automotriz', 'frenos', 'llantas']
};

const HABILIDADES_PREDEFINIDAS = Object.keys(OFICIOS).map((key) => ({
  value: key,
  label: key.replace(/(^\w|[-_\s]\w)/g, (match) => match.trim().replace('-', ' ')).replace(/\b\w/g, (char) => char.toUpperCase())
}));

function normalizarTexto(valor = '') {
  return String(valor)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  OFICIOS,
  HABILIDADES_PREDEFINIDAS,
  normalizarTexto
};
