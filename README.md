# brocolyBackAlamo

API de Alamo. Endpoints (requieren `Authorization: Bearer <API_KEY>`):

- `GET /api/articulos` — catálogo reducido (`?sku=X` (o `?articulo=X`) para un artículo, `?refresh=1` actualiza el caché, `?seccion=2,3` filtra por sección fiscal, `?conPrecio=1` solo los que tienen precio; cada artículo trae `TIENE_PRECIO`; no incluye la sección 5 "NO USAR")
- `GET /api/articulos-control` — detalle completo (mismos parámetros que `/api/articulos`; incluye la sección 5)
- `GET /api/costos` — `SKU` y `COSTO` (costo total sin IVA) para cargar costos; mismos parámetros que `/api/articulos`
- `GET /api/cuentas` — cuentas activas con zona y centro (`?cuenta=X` o `?buscar=texto`, mín. 3 caracteres)
- `GET /api/contactos` — teléfono y email por cuenta (mismos filtros)
- `GET /health`

Configurar `.env` a partir de `.env.example`.

## Despliegue

Cada `push` a `main` se despliega solo: GitHub avisa a `POST /webhook` (firmado con `GITHUB_WEBHOOK_SECRET`) y el servidor ejecuta `scripts/deploy.sh`, que actualiza el código, reinstala dependencias solo si cambió `package.json` y recarga la API con pm2 (`ecosystem.config.js`). El resultado queda en `deploy.log`.

