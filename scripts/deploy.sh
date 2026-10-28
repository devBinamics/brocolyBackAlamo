#!/bin/bash
# scripts/deploy.sh
# Lo ejecuta el webhook de GitHub tras un push a main: deja el código igual a origin/main y recarga la API.
# No toca el .env, node_modules ni los logs (no están en el repositorio).
set -e
cd "$(dirname "$0")/.."

echo "=== Deploy $(date -Is) ==="
ANTES=$(git rev-parse HEAD)
git fetch origin main
git reset --hard origin/main
DESPUES=$(git rev-parse HEAD)
echo "Código: ${ANTES:0:7} -> ${DESPUES:0:7}"

# Solo reinstala dependencias si cambió package.json o package-lock.json.
if git diff --name-only "$ANTES" "$DESPUES" | grep -qE '^package(-lock)?\.json$'; then
  echo "Cambiaron las dependencias: npm install"
  npm install --omit=dev
fi

# Si pm2 todavía no tiene la app, la arranca; si ya la tiene, la recarga.
if pm2 describe alamo > /dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi
echo "=== Deploy OK ==="
