#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# deploy.sh local (criado à mão no VPS) bloqueia o pull quando entra no repositório
if [ -f deploy.sh ] && ! git ls-files --error-unmatch deploy.sh >/dev/null 2>&1; then
  echo "Removendo deploy.sh local não versionado para permitir git pull..."
  rm -f deploy.sh
fi

if ! git pull origin main; then
  echo "ERRO: git pull falhou. Rode: rm -f deploy.sh && git pull origin main"
  exit 1
fi

echo "Commit: $(git rev-parse --short HEAD)"

if [ -f .env ]; then
  service_key=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//; s/["'\'']$//')
  if [ -n "$service_key" ] && [[ "$service_key" == sb_publishable_* ]]; then
    echo "ERRO: SUPABASE_SERVICE_ROLE_KEY no .env é publishable (sb_publishable_...)."
    echo "Use Secret key (sb_secret_...) ou Legacy → service_role no Supabase → Settings → API Keys."
    exit 1
  fi
fi

# Vite/esbuild estão em devDependencies — não usar NODE_ENV=production no install
npm install --include=dev
npm run build
export NODE_ENV=production

# Servidor sem rotas /api gera dist/index.js ~800 bytes; com login embutido, ~10kb+
size=$(wc -c < dist/index.js | tr -d ' ')
if [ "$size" -lt 5000 ]; then
  echo "ERRO: dist/index.js tem apenas ${size} bytes."
  echo "O git pull não aplicou o código novo (rotas /api em server/index.ts)."
  exit 1
fi

if pm2 describe bridal-app >/dev/null 2>&1; then
  pm2 restart bridal-app
else
  pm2 start ecosystem.config.cjs
fi
pm2 save 2>/dev/null || true

sleep 1
if ! curl -sf "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null; then
  echo "ERRO: Node local não responde /api/health. Veja: pm2 logs bridal-app"
  exit 1
fi

echo "Deploy finalizado! (dist/index.js: ${size} bytes)"
echo "JSON local: curl -s http://127.0.0.1:${PORT:-3000}/api/health"
