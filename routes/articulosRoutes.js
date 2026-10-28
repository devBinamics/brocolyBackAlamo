// routes/articulosRoutes.js
const express = require('express');
const compression = require('compression');
const { getArticulos, getArticulosCatalogo, getArticulosCostos } = require('../controllers/articulosController');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// Los dos endpoints aceptan los mismos parámetros: sku (o articulo), seccion (o secciones), conPrecio y refresh.
// GET /api/articulos-control            -> todos los artículos (una fila por artículo y lista), con caché de 10 min
// GET /api/articulos-control?refresh=1  -> fuerza actualizar el caché
// GET /api/articulos-control?sku=X      -> un artículo (también acepta ?articulo=X)
// GET /api/articulos-control?seccion=2,3 -> solo los artículos de esas secciones fiscales
// GET /api/articulos-control?conPrecio=1 -> solo los que tienen precio de lista (combinable con seccion)
router.get('/articulos-control', authenticateToken, getArticulos);

// GET /api/articulos            -> catálogo reducido (solo los datos del importador), con caché de 10 min
// GET /api/articulos?refresh=1  -> fuerza actualizar el caché
// GET /api/articulos?sku=X      -> un artículo (sin caché; también acepta ?articulo=X)
// GET /api/articulos?seccion=2,3 -> solo los de esas secciones fiscales (sin caché)
// GET /api/articulos?conPrecio=1 -> solo los que tienen precio de lista (sin caché; combinable con seccion)
// La compresión gzip se aplica solo a esta ruta.
router.get('/articulos', compression(), authenticateToken, getArticulosCatalogo);

// GET /api/costos               -> SKU y COSTO (costo total sin IVA) de cada artículo, con caché de 10 min
// Acepta los mismos parámetros que /api/articulos (sku, seccion, conPrecio, refresh) y excluye la sección 5 como el catálogo.
router.get('/costos', compression(), authenticateToken, getArticulosCostos);

module.exports = router;
