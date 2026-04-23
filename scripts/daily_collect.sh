#!/bin/bash
# Cipia - Script de collecte quotidienne
# A executer via cron tous les jours a 6h00
#
# Installation cron:
#   crontab -e
#   0 6 * * * /path/to/veille/scripts/daily_collect.sh >> /path/to/veille/logs/cron.log 2>&1

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_DIR/.venv"
DB_PATH="$PROJECT_DIR/data/veille.db"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/daily_$(date +%Y%m%d).log"

# Creer le repertoire logs si necessaire
mkdir -p "$LOG_DIR"

# Logging
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "Cipia - Collecte quotidienne"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# Activer l'environnement virtuel
source "$VENV_DIR/bin/activate"

# Aller au repertoire du projet
cd "$PROJECT_DIR"

# 1. Collecte des articles
echo ""
echo "[1/3] Collecte des articles..."
python main.py collect

# 2. Traitement IA
echo ""
echo "[2/3] Traitement IA des nouveaux articles..."
python main.py process --limit 100

# 3. Statut
echo ""
echo "[3/3] Resume:"
python main.py status

echo ""
echo "=========================================="
echo "Collecte terminee a $(date '+%H:%M:%S')"
echo "=========================================="

# Nettoyer les logs anciens (garder 30 jours)
find "$LOG_DIR" -name "daily_*.log" -mtime +30 -delete 2>/dev/null || true
