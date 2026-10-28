// controllers/articulosController.js
const articulosModel = require('../models/articulosModel');

// ?conPrecio=1 (o true): solo los artículos con precio de lista.
function leerConPrecio(query) {
  return ['1', 'true'].includes(String(query.conPrecio ?? '').toLowerCase());
}

// ?seccion=2 o ?seccion=2,3 (también ?secciones=...): códigos de sección fiscal. Devuelve null si alguno no es válido.
function leerSecciones(query) {
  const crudo = query.seccion ?? query.secciones;
  if (crudo === undefined || crudo === '') return [];
  const codigos = String(crudo).split(',').map(c => c.trim()).filter(Boolean);
  const validos = codigos.length > 0 && codigos.length <= 20 && codigos.every(c => /^[A-Za-z0-9]{1,10}$/.test(c));
  return validos ? [...new Set(codigos)] : null;
}

// Parámetros comunes a los dos endpoints: sku (o articulo), seccion (o secciones), conPrecio y refresh.
// Devuelve null en secciones si alguna no es válida.
function leerParametros(query) {
  return {
    sku: query.sku ?? query.articulo,
    secciones: leerSecciones(query),
    conPrecio: leerConPrecio(query),
    refresh: query.refresh === '1',
  };
}

const ERROR_SECCION = { error: 'seccion inválida: usar códigos separados por coma, ej. ?seccion=2,3' };

async function getArticulos(req, res) {
  try {
    const { sku, secciones, conPrecio, refresh } = leerParametros(req.query);
    if (secciones === null) return res.status(400).json(ERROR_SECCION);
    const t0 = Date.now();
    const data = await articulosModel.getArticulosControl(sku, { refresh, secciones, conPrecio });
    console.log(`getArticulos sku=${sku ?? '-'} seccion=${secciones.join(',') || '-'}: ${data.length} filas, total ${Date.now() - t0} ms`);
    res.json(data);
  } catch (err) {
    console.error('Error en getArticulos:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getArticulosCatalogo(req, res) {
  try {
    const { sku, secciones, conPrecio, refresh } = leerParametros(req.query);
    if (secciones === null) return res.status(400).json(ERROR_SECCION);
    const t0 = Date.now();
    const data = await articulosModel.getArticulosCatalogo(sku, { refresh, secciones, conPrecio });
    console.log(`getArticulosCatalogo sku=${sku ?? '-'} seccion=${secciones.join(',') || '-'}: ${data.length} filas, total ${Date.now() - t0} ms`);
    res.json(data);
  } catch (err) {
    console.error('Error en getArticulosCatalogo:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getArticulosCostos(req, res) {
  try {
    const { sku, secciones, conPrecio, refresh } = leerParametros(req.query);
    if (secciones === null) return res.status(400).json(ERROR_SECCION);
    const t0 = Date.now();
    const data = await articulosModel.getArticulosCostos(sku, { refresh, secciones, conPrecio });
    console.log(`getArticulosCostos sku=${sku ?? '-'} seccion=${secciones.join(',') || '-'}: ${data.length} filas, total ${Date.now() - t0} ms`);
    res.json(data);
  } catch (err) {
    console.error('Error en getArticulosCostos:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getArticulos, getArticulosCatalogo, getArticulosCostos };
