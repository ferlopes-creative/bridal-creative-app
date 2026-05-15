#!/bin/bash
# Corrige deploy travado no VPS (git pull bloqueado + dist/index.js 788b)
set -euo pipefail

cd "$(dirname "$0")/.."
export NODE_ENV=production

echo "=== 1. Git pull (remove deploy.sh local se bloquear) ==="
rm -f deploy.sh
git fetch origin main
git reset --hard origin/main
echo "Commit: $(git rev-parse --short HEAD) ($(git log -1 --format='%s'))"

if ! grep -q 'app.post("/api/admin-login"' server/index.ts; then
  echo "ERRO: server/index.ts ainda sem rotas /api. O pull não trouxe o código certo."
  exit 1
fi

echo "=== 2. Build ==="
npm install
npm run build

size=$(wc -c < dist/index.js | tr -d ' ')
echo "dist/index.js: ${size} bytes"
if [ "$size" -lt 5000 ]; then
  echo "ERRO: dist/index.js muito pequeno. Build falhou ou código antigo."
  exit 1
fi

echo "=== 3. PM2 ==="
if pm2 describe bridal-app >/dev/null 2>&1; then
  pm2 delete bridal-app || true
fi
pm2 start ecosystem.config.cjs
pm2 save

echo "=== 4. Teste local ==="
sleep 1
curl -sf "http://127.0.0.1:${PORT:-3000}/api/health" || {
  echo "ERRO: /api/health não respondeu JSON no Node local."
  pm2 logs bridal-app --lines 30 --nostream
  exit 1
}

echo ""
echo "OK. Se o navegador ainda falhar, configure nginx para proxy_pass em :3000 (ver deploy/nginx.example.conf)"
