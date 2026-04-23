#!/bin/bash
# =============================================================================
# Cipia — Master deploy script
# Orchestre : OVH DNS -> Hetzner setup -> DB sync -> SSL -> smoke test
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
VPS_IP="5.223.72.40"
VPS_USER="root"
DOMAIN="cipia.fr"
LOCAL_DB="${PROJECT_DIR}/data/veille.db"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

# ── Pre-flight checks ────────────────────────────────────────────────────────
command -v sshpass >/dev/null || err "sshpass manquant : sudo apt install sshpass"
command -v python3 >/dev/null || err "python3 manquant"
[ -f "${LOCAL_DB}" ] || warn "DB locale absente : ${LOCAL_DB} (skip sync DB)"

export SSHPASS="${SSHPASS:-H@t\${a4f}=nLW!i}"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"

# ── Step 1 : OVH DNS ──────────────────────────────────────────────────────────
log "[1/6] Configuration DNS OVH pour ${DOMAIN}..."
if [ -z "${OVH_APP_KEY:-}" ] || [ -z "${OVH_APP_SECRET:-}" ] || [ -z "${OVH_CONSUMER_KEY:-}" ]; then
  err "Variables OVH manquantes. Creer un token sur https://eu.api.ovh.com/createToken/?GET=/domain/zone/${DOMAIN}/*&PUT=/domain/zone/${DOMAIN}/*&POST=/domain/zone/${DOMAIN}/*&DELETE=/domain/zone/${DOMAIN}/* puis exporter OVH_APP_KEY, OVH_APP_SECRET, OVH_CONSUMER_KEY"
fi
python3 "${SCRIPT_DIR}/ovh-dns-setup.py"

# ── Step 2 : Attendre propagation DNS ─────────────────────────────────────────
log "[2/6] Attente propagation DNS..."
for i in $(seq 1 40); do
  resolved=$(host "${DOMAIN}" 8.8.8.8 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  if [ "${resolved}" = "${VPS_IP}" ]; then
    log "      DNS propage : ${DOMAIN} -> ${VPS_IP}"
    break
  fi
  if [ $i -eq 40 ]; then
    err "DNS pas propage apres 20 min. Verifier chez OVH."
  fi
  printf "      ... tentative %d/40 (resolved: %s)\r" "$i" "${resolved:-<rien>}"
  sleep 30
done

# ── Step 3 : Upload deploy script + run ───────────────────────────────────────
log "[3/6] Upload + execution cipia-deploy.sh sur ${VPS_IP}..."
sshpass -e scp ${SSH_OPTS} "${SCRIPT_DIR}/cipia-deploy.sh" "${VPS_USER}@${VPS_IP}:/tmp/"
sshpass -e ssh ${SSH_OPTS} "${VPS_USER}@${VPS_IP}" "bash /tmp/cipia-deploy.sh"

# ── Step 4 : Sync DB (462 articles deja collectes) ────────────────────────────
if [ -f "${LOCAL_DB}" ]; then
  log "[4/6] Sync DB locale vers VPS..."
  sshpass -e ssh ${SSH_OPTS} "${VPS_USER}@${VPS_IP}" "mkdir -p /opt/cipia/data && pm2 stop cipia-frontend || true"
  sshpass -e scp ${SSH_OPTS} "${LOCAL_DB}" "${VPS_USER}@${VPS_IP}:/opt/cipia/data/veille.db"
  sshpass -e ssh ${SSH_OPTS} "${VPS_USER}@${VPS_IP}" "chown -R root:root /opt/cipia/data && pm2 restart cipia-frontend"
  log "      DB synchronisee + PM2 redemarre"
else
  warn "[4/6] Pas de DB locale, skip"
fi

# ── Step 5 : Upload les secrets (.env) ────────────────────────────────────────
log "[5/6] Verification secrets..."
sshpass -e ssh ${SSH_OPTS} "${VPS_USER}@${VPS_IP}" 'grep -l "REMPLACER" /opt/cipia/frontend/.env.local /opt/cipia/.env 2>/dev/null' && \
  warn "      Secrets a remplir manuellement : /opt/cipia/frontend/.env.local et /opt/cipia/.env" || \
  log "      Secrets OK"

# ── Step 6 : Smoke test ───────────────────────────────────────────────────────
log "[6/6] Smoke test production..."
sleep 5
for path in / /connexion /pricing /api/auth/me; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://${DOMAIN}${path}" 2>/dev/null || echo "000")
  case "${code}" in
    200|307) echo "  ${GREEN}OK${NC}  https://${DOMAIN}${path} -> ${code}" ;;
    *) echo "  ${RED}FAIL${NC} https://${DOMAIN}${path} -> ${code}" ;;
  esac
done

echo
log "===================================================="
log "  Deploiement Cipia termine"
log "===================================================="
echo "  URL : https://${DOMAIN}"
echo "  Logs PM2 : ssh ${VPS_USER}@${VPS_IP} pm2 logs cipia-frontend"
