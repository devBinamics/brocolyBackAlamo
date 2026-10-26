# brocolyBackAlamo

API de Alamo. Endpoints (requieren `Authorization: Bearer <API_KEY>`):

- `GET /api/articulos` — catálogo reducido (`?sku=X` para un artículo)
- `GET /api/articulos-control` — detalle completo (`?sku=X` o `?articulo=X`)
- `GET /api/cuentas` — cuentas activas (`?cuenta=X` o `?buscar=texto`, mín. 3 caracteres)
- `GET /api/contactos` — teléfono y email por cuenta (mismos filtros)
- `GET /health`

Configurar `.env` a partir de `.env.example`.
