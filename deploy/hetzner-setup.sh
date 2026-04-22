#!/bin/bash
# =============================================================================
# Hetzner VPS Setup — ContentVibe Pipeline + VeilleFormation
# Ubuntu 22.04 LTS
# =============================================================================
set -e

# ── Config ────────────────────────────────────────────────────────────────────
APP_USER="contentvibe"
APP_DIR="/app"
PIPELINE_DIR="${APP_DIR}/blog-automation-pipeline-BDD"
SETUP_DIR="${APP_DIR}/contentvibe"
PG_DB="contentvibe"
PG_USER="contentvibe"
PG_PASS="${1:-PyxeE40xo3Skqvv6pIHS}"   # Passer en argument : ./hetzner-setup.sh monpassword

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

echo "========================================================"
echo "  ContentVibe — Setup Hetzner VPS"
echo "  PostgreSQL + Node.js 20 + PM2 + Nginx"
echo "========================================================"
echo ""

# ── 1. Système ────────────────────────────────────────────────────────────────
log "[1/9] Mise à jour du système..."
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban nginx certbot python3-certbot-nginx \
  build-essential python3 python3-pip logwatch unzip

# ── 2. Node.js 20 ─────────────────────────────────────────────────────────────
log "[2/9] Installation Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2 ts-node typescript
log "Node.js $(node -v) installé"

# ── 3. PostgreSQL ─────────────────────────────────────────────────────────────
log "[3/9] Installation PostgreSQL..."
apt install -y postgresql postgresql-contrib

systemctl enable postgresql
systemctl start postgresql

# Créer user + base
sudo -u postgres psql -c "CREATE USER ${PG_USER} WITH PASSWORD '${PG_PASS}';" 2>/dev/null || \
  sudo -u postgres psql -c "ALTER USER ${PG_USER} WITH PASSWORD '${PG_PASS}';"
sudo -u postgres psql -c "CREATE DATABASE ${PG_DB} OWNER ${PG_USER};" 2>/dev/null || \
  warn "Base ${PG_DB} déjà existante"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${PG_DB} TO ${PG_USER};"

log "PostgreSQL configuré — base: ${PG_DB}, user: ${PG_USER}"

# ── 4. Utilisateur applicatif ─────────────────────────────────────────────────
log "[4/9] Création de l'utilisateur ${APP_USER}..."
id -u ${APP_USER} &>/dev/null || useradd -m -s /bin/bash ${APP_USER}
mkdir -p ${APP_DIR}
chown ${APP_USER}:${APP_USER} ${APP_DIR}

# ── 5. Répertoires ────────────────────────────────────────────────────────────
log "[5/9] Création des répertoires..."
mkdir -p ${PIPELINE_DIR}
mkdir -p ${SETUP_DIR}
mkdir -p ${APP_DIR}/logs
mkdir -p /var/backups/contentvibe
chown -R ${APP_USER}:${APP_USER} ${APP_DIR}

# ── 6. Firewall ───────────────────────────────────────────────────────────────
log "[6/9] Configuration du firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 4242/tcp    # ContentVibe Setup UI (local uniquement — à fermer après config)
ufw --force enable

# ── 7. Nginx ──────────────────────────────────────────────────────────────────
log "[7/9] Configuration Nginx..."

# Site contentvibe-setup (port 4242, accès local)
cat > /etc/nginx/sites-available/contentvibe-setup << 'NGINX'
server {
    listen 80;
    server_name setup.PLACEHOLDER;

    location / {
        proxy_pass http://127.0.0.1:4242;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 8. PM2 cron pipeline ──────────────────────────────────────────────────────
log "[8/9] Configuration PM2..."

# Ecosystem PM2
cat > ${APP_DIR}/ecosystem.config.js << 'PM2'
module.exports = {
  apps: [
    {
      name: 'contentvibe-setup',
      script: 'server.js',
      cwd: '/app/contentvibe',
      env: { PORT: 4242, NODE_ENV: 'production' },
      restart_delay: 5000,
    },
    {
      name: 'pipeline-retrieve',
      script: 'src/index.ts',
      interpreter: 'ts-node',
      cwd: '/app/blog-automation-pipeline-BDD',
      args: '--retrieve',
      cron_restart: '*/30 * * * *',   // toutes les 30 min
      autorestart: false,
    },
  ],
};
PM2

chown ${APP_USER}:${APP_USER} ${APP_DIR}/ecosystem.config.js

# ── 9. Backup PostgreSQL ──────────────────────────────────────────────────────
log "[9/9] Configuration backup PostgreSQL..."

cat > /usr/local/bin/backup-pg.sh << BACKUP
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/contentvibe"
mkdir -p \${BACKUP_DIR}
sudo -u postgres pg_dump ${PG_DB} | gzip > \${BACKUP_DIR}/contentvibe_\${DATE}.sql.gz
find \${BACKUP_DIR} -name "*.gz" -mtime +30 -delete
echo "Backup: contentvibe_\${DATE}.sql.gz"
BACKUP

chmod +x /usr/local/bin/backup-pg.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-pg.sh >> /var/log/backup-contentvibe.log 2>&1") | crontab -

# ── Cron hebdo pipeline (lundi 7h) ────────────────────────────────────────────
cat > /etc/cron.d/contentvibe-pipeline << CRON
# ContentVibe — Cycle hebdomadaire lundi 7h
0 7 * * 1 ${APP_USER} cd ${PIPELINE_DIR} && /usr/bin/npm run subjects >> ${APP_DIR}/logs/pipeline.log 2>&1
30 7 * * 1 ${APP_USER} cd ${PIPELINE_DIR} && /usr/bin/npm run launch >> ${APP_DIR}/logs/pipeline.log 2>&1
CRON

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo "========================================================"
echo "  Installation terminée !"
echo "========================================================"
echo ""
echo "  PostgreSQL  : postgresql://${PG_USER}:${PG_PASS}@localhost:5432/${PG_DB}"
echo "  Setup UI    : http://$(curl -s ifconfig.me):4242"
echo ""
echo "  Prochaines étapes :"
echo ""
echo "  1. Déployer le pipeline :"
echo "     scp -r blog-automation-pipeline-BDD/ root@IP:${PIPELINE_DIR}"
echo "     scp -r contentvibe/ root@IP:${SETUP_DIR}"
echo ""
echo "  2. Configurer le .env :"
echo "     cp ${PIPELINE_DIR}/.env.example ${PIPELINE_DIR}/.env"
echo "     nano ${PIPELINE_DIR}/.env"
echo ""
echo "  3. Initialiser la base :"
echo "     cd ${PIPELINE_DIR} && npm install && npm run setup-db"
echo ""
echo "  4. Démarrer les services :"
echo "     pm2 start ${APP_DIR}/ecosystem.config.js"
echo "     pm2 save && pm2 startup"
echo ""
echo "  5. [Optionnel] SSL pour le setup UI :"
echo "     certbot --nginx -d setup.tondomaine.fr"
echo "========================================================"
