#!/bin/bash
# VeilleFormation.fr - Envoi newsletter hebdomadaire
# A executer via cron chaque mardi a 8h00
#
# Installation cron:
#   crontab -e
#   0 8 * * 2 /path/to/veille/scripts/weekly_newsletter.sh >> /path/to/veille/logs/newsletter.log 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_DIR/.venv"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/newsletter_$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "VeilleFormation.fr - Newsletter hebdo"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

source "$VENV_DIR/bin/activate"
cd "$PROJECT_DIR"

# Generer et envoyer la newsletter
python main.py newsletter

echo ""
echo "=========================================="
echo "Newsletter terminee a $(date '+%H:%M:%S')"
echo "=========================================="
