#!/bin/bash
# Cipia healthcheck — verifie l'etat du systeme et envoie une alerte Telegram si KO
#
# Verifie :
#   1. Derniere collecte BOAMP/Legifrance < 26h
#   2. Articles enrichis IA recents (status='done') < 26h
#   3. App web https://cipia.fr/api/articles?limit=1 -> 200
#   4. Espace disque VPS < 90%
#
# Cron VPS recommande : 0 9 * * * /opt/cipia/scripts/healthcheck.sh
#
# Variables d'env requises (via /etc/cipia.env ou export):
#   TELEGRAM_BOT_TOKEN
#   TELEGRAM_CHAT_ID
#   CIPIA_DB    (default: /opt/cipia/data/veille.db)
#   CIPIA_URL   (default: https://cipia.fr)

set -uo pipefail

# Charger config si present
[ -f /etc/cipia.env ] && source /etc/cipia.env

DB="${CIPIA_DB:-/opt/cipia/data/veille.db}"
URL="${CIPIA_URL:-https://cipia.fr}"
BOT="${TELEGRAM_BOT_TOKEN:-}"
CHAT="${TELEGRAM_CHAT_ID:-}"

ISSUES=()
STATS=""

# 1. DB existe + age derniere collecte
if [ ! -f "$DB" ]; then
  ISSUES+=("DB introuvable: $DB")
else
  HOURS_SINCE_COLLECT=$(sqlite3 "$DB" "SELECT CAST((strftime('%s','now') - strftime('%s', MAX(collected_at))) / 3600 AS INTEGER) FROM articles" 2>/dev/null || echo 999)
  if [ -z "$HOURS_SINCE_COLLECT" ] || [ "$HOURS_SINCE_COLLECT" -gt 26 ]; then
    ISSUES+=("Aucune collecte depuis ${HOURS_SINCE_COLLECT}h (>26h)")
  fi

  HOURS_SINCE_PROCESS=$(sqlite3 "$DB" "SELECT CAST((strftime('%s','now') - strftime('%s', MAX(processed_at))) / 3600 AS INTEGER) FROM articles WHERE status='done'" 2>/dev/null || echo 999)
  if [ -z "$HOURS_SINCE_PROCESS" ] || [ "$HOURS_SINCE_PROCESS" -gt 26 ]; then
    ISSUES+=("Aucun traitement IA depuis ${HOURS_SINCE_PROCESS}h (>26h)")
  fi

  TOTAL=$(sqlite3 "$DB" "SELECT COUNT(*) FROM articles" 2>/dev/null || echo 0)
  DONE=$(sqlite3 "$DB" "SELECT COUNT(*) FROM articles WHERE status='done'" 2>/dev/null || echo 0)
  FAILED=$(sqlite3 "$DB" "SELECT COUNT(*) FROM articles WHERE status='failed'" 2>/dev/null || echo 0)
  RECENT=$(sqlite3 "$DB" "SELECT COUNT(*) FROM articles WHERE collected_at > datetime('now', '-7 days')" 2>/dev/null || echo 0)

  if [ "$FAILED" -gt 20 ]; then
    ISSUES+=("$FAILED articles en echec (>20)")
  fi

  STATS="$TOTAL articles total, $DONE enrichis, $RECENT collectes 7j, $FAILED en echec"
fi

# 2. App web 200
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$URL/api/articles?limit=1")
if [ "$HTTP" != "200" ]; then
  ISSUES+=("App web KO: HTTP $HTTP sur $URL/api/articles")
fi

# 3. Disque
DISK_USE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USE" -gt 90 ]; then
  ISSUES+=("Disque plein: ${DISK_USE}% utilise")
fi

# 4. Resultat + alerte Telegram si KO
if [ ${#ISSUES[@]} -eq 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M')] OK - $STATS"
  exit 0
fi

# Build message
MSG="🚨 *Cipia healthcheck KO*"$'\n\n'
for issue in "${ISSUES[@]}"; do
  MSG+="❌ $issue"$'\n'
done
MSG+=$'\n'"📊 $STATS"$'\n'
MSG+="🌐 $URL"

# Log
echo "[$(date '+%Y-%m-%d %H:%M')] KO" >&2
for issue in "${ISSUES[@]}"; do
  echo "  - $issue" >&2
done

# Envoi Telegram
if [ -n "$BOT" ] && [ -n "$CHAT" ]; then
  curl -s -X POST "https://api.telegram.org/bot${BOT}/sendMessage" \
    -d chat_id="$CHAT" \
    -d parse_mode="Markdown" \
    --data-urlencode text="$MSG" > /dev/null
  echo "Alerte Telegram envoyee" >&2
else
  echo "TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant - alerte non envoyee" >&2
fi

exit 1
