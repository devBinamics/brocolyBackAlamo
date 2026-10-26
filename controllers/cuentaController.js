// controllers/cuentaController.js
const cuentaModel = require('../models/cuentaModel');

async function getCuentas(req, res) {
  req.setTimeout(2 * 60 * 1000);
  try {
    const { cuenta, buscar } = req.query;
    if (buscar && buscar.length < 3) return res.json([]);
    const data = await cuentaModel.getCuentas({ cuenta, buscar });
    res.json(data);
  } catch (err) {
    console.error('Error en getCuentas:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getContactos(req, res) {
  req.setTimeout(2 * 60 * 1000);
  try {
    const { cuenta, buscar } = req.query;
    if (buscar && buscar.length < 3) return res.json([]);
    const data = await cuentaModel.getContactos({ cuenta, buscar });
    res.json(data);
  } catch (err) {
    console.error('Error en getContactos:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getCuentas, getContactos };
