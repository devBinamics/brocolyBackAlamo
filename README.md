# brocolyBackAlamo

API de Alamo. Endpoints (requieren `Authorization: Bearer <API_KEY>`):

- `GET /api/articulos` — catálogo reducido (`?sku=X` para un artículo)
- `GET /api/articulos-control` — detalle completo (`?sku=X` o `?articulo=X`)
- `GET /health`

Configurar `.env` a partir de `.env.example`.
