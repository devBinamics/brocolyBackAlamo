// routes/cuentaRoutes.js
const express = require('express');
const compression = require('compression');
const { getCuentas, getContactos } = require('../controllers/cuentaController');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// GET /api/cuentas                -> todas las cuentas activas
// GET /api/cuentas?cuenta=X       -> una cuenta
// GET /api/cuentas?buscar=texto   -> por código o nombre (mínimo 3 caracteres)
router.get('/cuentas', compression(), authenticateToken, getCuentas);

// GET /api/contactos              -> teléfono y email de las cuentas activas (mismos filtros que /cuentas)
router.get('/contactos', compression(), authenticateToken, getContactos);

module.exports = router;
