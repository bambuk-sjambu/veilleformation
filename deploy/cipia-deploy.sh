#!/bin/bash
# =============================================================================
# Cipia — Deploy script pour Hetzner VPS 5.223.72.40
# Idempotent : peut être relancé sans casser l'existant
# =============================================================================
set -euo pipefail

APP_DIR="/opt/cipia"
REPO_URL="https://github.com/bambuk-sjambu/veilleformation.git"
DOMAIN="cipia.fr"
NEXT_PORT="3000"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

[ "$EUID" -eq 0 ] || err "Executer en root (ssh root@5.223.72.40)"

# ── 1. Prerequis systeme ──────────────────────────────────────────────────────
log "[1/9] Verification prerequis (node, python, nginx, pm2, certbot)..."
command -v node >/dev/null || err "Node.js absent"
command -v python3 >/dev/null || err "Python3 absent"
command -v nginx >/dev/null || err "nginx absent"
command -v pm2 >/dev/null || err "PM2 absent"
command -v certbot >/dev/null || { apt install -y certbot python3-certbot-nginx; }

# ── 2. Code source ────────────────────────────────────────────────────────────
log "[2/9] Sync code vers ${APP_DIR}..."
mkdir -p "${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  cd "${APP_DIR}" && git fetch origin main && git reset --hard origin/main
else
  git clone "${REPO_URL}" "${APP_DIR}"
fi

# ── 3. Backend Python ─────────────────────────────────────────────────────────
log "[3/9] Venv + deps Python..."
cd "${APP_DIR}"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --upgrade pip --quiet
.venv/bin/pip install -r requirements.txt --quiet

# ── 4. Frontend Next.js (install + build prod) ────────────────────────────────
log "[4/9] Build Next.js..."
cd "${APP_DIR}/frontend"
npm ci --silent
npm run build

# ── 5. Env vars (ne pas ecraser si deja present) ──────────────────────────────
log "[5/9] Config .env.local..."
if [ ! -f "${APP_DIR}/frontend/.env.local" ]; then
  cat > "${APP_DIR}/frontend/.env.local" << EOF
SESSION_PASSWORD=REMPLACER_PAR_32_CHARS_MINIMUM_ALEATOIRES
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
ANTHROPIC_API_KEY=
BREVO_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SOLO_MONTHLY=
STRIPE_PRICE_SOLO_YEARLY=
STRIPE_PRICE_EQUIPE_MONTHLY=
STRIPE_PRICE_EQUIPE_YEARLY=
STRIPE_PRICE_AGENCE_MONTHLY=
STRIPE_PRICE_AGENCE_YEARLY=
EOF
  warn "Fichier .env.local cree — REMPLIR les secrets avant de lancer PM2"
fi

if [ ! -f "${APP_DIR}/.env" ]; then
  cat > "${APP_DIR}/.env" << EOF
ANTHROPIC_API_KEY=
BREVO_API_KEY=
LEGIFRANCE_CLIENT_ID=
LEGIFRANCE_CLIENT_SECRET=
EOF
  warn "Fichier .env cree — REMPLIR les secrets avant cron collecte"
fi

# ── 6. PM2 (ajout sans casser les autres apps) ────────────────────────────────
log "[6/9] Config PM2 pour Cipia..."
pm2 describe cipia-frontend >/dev/null 2>&1 && pm2 delete cipia-frontend || true

cd "${APP_DIR}/frontend"
pm2 start npm --name "cipia-frontend" -- start -- -p ${NEXT_PORT}
pm2 save

# ── 7. Nginx vhost (HTTP only initial — certbot --nginx ajoutera HTTPS) ─────
log "[7/9] Config nginx vhost HTTP..."
cat > /etc/nginx/sites-available/cipia << NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:${NEXT_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/cipia /etc/nginx/sites-enabled/cipia
mkdir -p /var/www/certbot
nginx -t && systemctl reload nginx

# ── 8. Certbot SSL (seulement si DNS pointe vers nous) ────────────────────────
log "[8/9] SSL Let's Encrypt..."
resolved_ip=$(dig +short ${DOMAIN} @8.8.8.8 | head -1)
this_ip=$(curl -s --max-time 5 ifconfig.me || echo "")
if [ -z "${resolved_ip}" ] || [ "${resolved_ip}" != "${this_ip}" ]; then
  warn "DNS ${DOMAIN} -> ${resolved_ip:-<rien>} != ${this_ip}. SSL skippe — relancer ce script plus tard."
elif [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  log "Certificat existant pour ${DOMAIN}, renouvellement auto via cron certbot"
else
  certbot --nginx \
    -d ${DOMAIN} -d www.${DOMAIN} \
    --non-interactive --agree-tos -m stephane@hi-commerce.fr --redirect \
    || warn "Certbot a echoue — verifier logs et relancer : certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi

# ── 9. Cron (collecte quotidienne + newsletter hebdo) ─────────────────────────
log "[9/9] Cron jobs..."
cat > /etc/cron.d/cipia << CRON
# Cipia — collecte quotidienne (6h) + newsletter hebdo mardi 8h
0 6 * * * root cd ${APP_DIR} && .venv/bin/python main.py collect >> /var/log/cipia-collect.log 2>&1
0 7 * * * root cd ${APP_DIR} && .venv/bin/python main.py process >> /var/log/cipia-process.log 2>&1
0 8 * * 2 root cd ${APP_DIR} && .venv/bin/python main.py newsletter >> /var/log/cipia-newsletter.log 2>&1
CRON
chmod 644 /etc/cron.d/cipia

# ── Resume ────────────────────────────────────────────────────────────────────
echo
log "===================================================="
log "  Deploiement Cipia termine"
log "===================================================="
echo
echo "  URL directe IP  : http://5.223.72.40:${NEXT_PORT} (debug seulement)"
echo "  URL prod        : https://${DOMAIN} (quand DNS + SSL OK)"
echo
echo "  A faire :"
echo "  1. Remplir les secrets dans ${APP_DIR}/frontend/.env.local et ${APP_DIR}/.env"
echo "  2. Verifier que le DNS cipia.fr pointe vers 5.223.72.40"
echo "  3. Relancer ce script pour declencher certbot si DNS pas encore propage"
echo "  4. pm2 restart cipia-frontend apres chaque modif d'env"
echo "  5. Synchroniser la DB: scp data/veille.db root@5.223.72.40:${APP_DIR}/data/"
echo
echo "  Logs :"
echo "  - PM2 Next.js    : pm2 logs cipia-frontend"
echo "  - Collecte cron  : tail -f /var/log/cipia-collect.log"
echo "  - nginx          : tail -f /var/log/nginx/error.log"
