#!/bin/bash
set -euo pipefail

git pull origin main
npm install
npm run build

# Servidor sem rotas /api gera dist/index.js ~800 bytes; com login embutido, ~10kb+
size=$(wc -c < dist/index.js | tr -d ' ')
if [ "$size" -lt 5000 ]; then
  echo "ERRO: dist/index.js tem apenas ${size} bytes."
  echo "A branch main não inclui as rotas /api em server/index.ts. Faça git pull após atualizar main no GitHub."
  exit 1
fi

pm2 restart bridal-app
echo "Deploy finalizado com sucesso! (dist/index.js: ${size} bytes)"
