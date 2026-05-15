#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"
export NODE_ENV=production

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
npm install
npm run build

# Servidor sem rotas /api gera dist/index.js ~800 bytes; com login embutido, ~10kb+
size=$(wc -c < dist/index.js | tr -d ' ')
if [ "$size" -lt 5000 ]; then
  echo "ERRO: dist/index.js tem apenas ${size} bytes."
  echo "O git pull não aplicou o código novo (rotas /api em server/index.ts)."
  exit 1
fi

pm2 restart bridal-app --update-env
echo "Deploy finalizado com sucesso! (dist/index.js: ${size} bytes)"
echo "Teste: curl -s http://127.0.0.1:\${PORT:-3000}/api/health"
