// controllers/articulosController.js
const articulosModel = require('../models/articulosModel');

async function getArticulos(req, res) {
  try {
    const { sku, articulo } = req.query;
    const data = await articulosModel.getArticulos(sku ?? articulo);
    res.json(data);
  } catch (err) {
    console.error('Error en getArticulos:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getArticulosCatalogo(req, res) {
  try {
    const { sku, refresh } = req.query;
    const t0 = Date.now();
    const data = await articulosModel.getArticulosCatalogo(sku, { refresh: refresh === '1' });
    console.log(`getArticulosCatalogo sku=${sku ?? '-'}: ${data.length} filas, total ${Date.now() - t0} ms`);
    res.json(data);
  } catch (err) {
    console.error('Error en getArticulosCatalogo:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getArticulos, getArticulosCatalogo };
