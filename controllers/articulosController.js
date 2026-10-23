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
    const { sku } = req.query;
    const data = await articulosModel.getArticulosCatalogo(sku);
    res.json(data);
  } catch (err) {
    console.error('Error en getArticulosCatalogo:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getArticulos, getArticulosCatalogo };
