#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"
export NODE_ENV=production

git pull origin main
echo "Commit: $(git rev-parse --short HEAD)"
npm install
npm run build

# Servidor sem rotas /api gera dist/index.js ~800 bytes; com login embutido, ~10kb+
size=$(wc -c < dist/index.js | tr -d ' ')
if [ "$size" -lt 5000 ]; then
  echo "ERRO: dist/index.js tem apenas ${size} bytes."
  echo "A branch main não inclui as rotas /api em server/index.ts. Faça git pull após atualizar main no GitHub."
  exit 1
fi

pm2 restart bridal-app --update-env
echo "Deploy finalizado com sucesso! (dist/index.js: ${size} bytes)"
echo "Teste: curl -s http://127.0.0.1:\${PORT:-3000}/api/health"
