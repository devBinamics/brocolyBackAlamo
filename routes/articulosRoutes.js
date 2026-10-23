// routes/articulosRoutes.js
const express = require('express');
const compression = require('compression');
const { getArticulos, getArticulosCatalogo } = require('../controllers/articulosController');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// GET /api/articulos-control            -> todos los artículos
// GET /api/articulos-control?sku=X      -> un artículo (también acepta ?articulo=X)
router.get('/articulos-control', authenticateToken, getArticulos);

// GET /api/articulos            -> catálogo reducido (solo los datos del importador), con caché de 10 min
// GET /api/articulos?refresh=1  -> fuerza actualizar el caché
// GET /api/articulos?sku=X      -> un artículo (sin caché)
// La compresión gzip se aplica solo a esta ruta.
router.get('/articulos', compression(), authenticateToken, getArticulosCatalogo);

module.exports = router;
