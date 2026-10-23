// routes/articulosRoutes.js
const express = require('express');
const { getArticulos, getArticulosCatalogo } = require('../controllers/articulosController');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// GET /api/articulos-control            -> todos los artículos
// GET /api/articulos-control?sku=X      -> un artículo (también acepta ?articulo=X)
router.get('/articulos-control', authenticateToken, getArticulos);

// GET /api/articulos            -> catálogo reducido (solo los datos del importador)
// GET /api/articulos?sku=X      -> un artículo
router.get('/articulos', authenticateToken, getArticulosCatalogo);

module.exports = router;
