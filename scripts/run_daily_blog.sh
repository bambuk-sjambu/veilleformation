#!/bin/bash
# VeilleFormation.fr - Orchestrateur quotidien de generation de blog
# Genere 5 articles SEO via Claude, verifie leur publication et envoie un rapport Telegram.
#
# Installation cron PythonAnywhere (Mon-Fri a 8h00 Paris):
#   0 8 * * 1-5 /home/veille/veillereglementaire/scripts/run_daily_blog.sh
#
# Prerequis :
#   - ANTHROPIC_API_KEY dans l'environnement ou dans .env
#   - TELEGRAM_BOT_TOKEN dans l'environnement ou dans .env
#   - TELEGRAM_CHAT_ID dans l'environnement ou dans .env

set -e

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_DIR/.venv"
LOG_DIR="$PROJECT_DIR/logs"
TODAY="$(date +%Y%m%d)"
LOG_FILE="$LOG_DIR/blog_${TODAY}.log"

# ---------------------------------------------------------------------------
# Creer le repertoire logs si necessaire
# ---------------------------------------------------------------------------
mkdir -p "$LOG_DIR"

# Rediriger toute la sortie vers le fichier de log ET stdout
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "VeilleFormation.fr - Generation blog quotidienne"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# ---------------------------------------------------------------------------
# Charger les variables d'environnement
# ---------------------------------------------------------------------------
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    echo "[INFO] Chargement des variables depuis $ENV_FILE"
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
else
    echo "[WARN] Fichier .env non trouve a $ENV_FILE"
fi

# ---------------------------------------------------------------------------
# Activer l'environnement virtuel
# ---------------------------------------------------------------------------
if [ -d "$VENV_DIR" ]; then
    echo "[INFO] Activation du venv: $VENV_DIR"
    source "$VENV_DIR/bin/activate"
else
    echo "[WARN] Venv non trouve a $VENV_DIR — utilisation du Python systeme"
fi

# Aller au repertoire du projet
cd "$PROJECT_DIR"

# ---------------------------------------------------------------------------
# 1. Generation des articles de blog
# ---------------------------------------------------------------------------
echo ""
echo "[1/3] Generation des articles de blog (5 articles max)..."
python scripts/generate_blog.py
GENERATE_EXIT=$?

if [ $GENERATE_EXIT -ne 0 ]; then
    echo "[ERROR] La generation a echoue (code $GENERATE_EXIT)"
    # On continue quand meme pour envoyer le rapport Telegram
fi

echo ""
echo "[INFO] Attente de 30 secondes (les articles sont lus directement depuis SQLite)..."
sleep 30

# ---------------------------------------------------------------------------
# 2. Verification des URLs
# ---------------------------------------------------------------------------
echo ""
echo "[2/3] Verification des URLs publiees..."
python scripts/verify_blog.py
VERIFY_EXIT=$?

if [ $VERIFY_EXIT -ne 0 ]; then
    echo "[WARN] La verification a rencontre des erreurs (code $VERIFY_EXIT)"
fi

# ---------------------------------------------------------------------------
# 3. Notification Telegram
# ---------------------------------------------------------------------------
echo ""
echo "[3/3] Envoi du rapport Telegram..."
python scripts/telegram_blog.py
TELEGRAM_EXIT=$?

if [ $TELEGRAM_EXIT -ne 0 ]; then
    echo "[WARN] Echec de la notification Telegram (code $TELEGRAM_EXIT)"
fi

# ---------------------------------------------------------------------------
# Resume
# ---------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "Generation terminee a $(date '+%H:%M:%S')"
echo "Log: $LOG_FILE"
echo "=========================================="

# Nettoyer les logs anciens (garder 60 jours)
find "$LOG_DIR" -name "blog_*.log" -mtime +60 -delete 2>/dev/null || true

exit 0
