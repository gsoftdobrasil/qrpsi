#!/usr/bin/env bash
#
# QRPSI — deploy do backend em produção (Linux).
#
# Copie este script para o servidor (pasta Out inteira ou só o .sh) e execute
# apontando para a pasta do backend no servidor, onde já existem
# package.json, package-lock.json, knexfile.ts, src/, .env, etc.
#
# Uso:
#   chmod +x deploy-backend.sh
#   ./deploy-backend.sh /var/www/qrpsi/backend
#
# Opcional — rodar migrations antes do prune (precisa do knexfile em TS):
#   RUN_MIGRATE=1 ./deploy-backend.sh /var/www/qrpsi/backend
#
# Opcional — reiniciar systemd após o deploy:
#   RESTART_SERVICE=qrpsid.service ./deploy-backend.sh /var/www/qrpsi/backend
#
set -euo pipefail

usage() {
  echo "Uso: $0 <caminho-da-pasta-backend>" >&2
  echo "Ex.: $0 /var/www/qrpsi/backend" >&2
  exit 1
}

[[ "${1:-}" == "" ]] && usage
[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && usage

if ! BACKEND_DIR="$(cd "$1" && pwd)"; then
  echo "Erro: pasta inválida: $1" >&2
  exit 1
fi

if [[ ! -f "${BACKEND_DIR}/package.json" ]]; then
  echo "Erro: não encontrei package.json em ${BACKEND_DIR}" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Erro: Node.js não está no PATH." >&2
  exit 1
fi

echo "==> Backend: ${BACKEND_DIR}"
echo "==> Node $(node -v) | npm $(npm -v)"
cd "${BACKEND_DIR}"

if [[ ! -f package-lock.json ]]; then
  echo "Aviso: package-lock.json ausente; usando npm install (menos reproduzível que npm ci)." >&2
  npm install
else
  echo "==> npm ci (instala devDependencies para o tsc build)"
  npm ci
fi

if [[ "${RUN_MIGRATE:-0}" == "1" ]]; then
  echo "==> knex migrate:latest"
  npm run migrate
fi

echo "==> npm run build (tsc -> dist/)"
npm run build

if [[ ! -f dist/server.js ]]; then
  echo "Erro: dist/server.js não foi gerado após o build." >&2
  exit 1
fi

echo "==> npm prune --omit=dev (só dependências de runtime)"
npm prune --omit=dev

echo "==> Deploy do backend concluído."
echo "    Entry: node ${BACKEND_DIR}/dist/server.js"
echo "    Confira .env (NODE_ENV=production, PROD_DB_*, DB_TRUST_CERT=true se cert. autoassinado, FRONTEND_URL, JWT_*, etc.)"

if [[ -n "${RESTART_SERVICE:-}" ]]; then
  echo "==> systemctl restart ${RESTART_SERVICE}"
  sudo systemctl restart "${RESTART_SERVICE}"
  sudo systemctl status "${RESTART_SERVICE}" --no-pager -l || true
fi

exit 0
