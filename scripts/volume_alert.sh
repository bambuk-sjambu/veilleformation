#!/bin/bash
# Cipia volume alert - notifie Telegram si une source critique tourne
# en dessous de son baseline 7j (signal de panne silencieuse).
#
# Logique :
#   - Pour chaque source critique (BOAMP, JORF, Centre Inffo) :
#     - Calcule volume des dernieres 24h vs baseline moyenne 7j
#     - Si volume_24h < 50% baseline_7j -> alerte
#   - Une seule alerte par source par jour (cache dans /tmp)
#
# Cron VPS recommande : 30 9 * * * /opt/cipia/scripts/volume_alert.sh
# (30 min apres healthcheck, 3h30 apres le cron collecte)
#
# Variables d'env (via /etc/cipia.env) :
#   TELEGRAM_BOT_TOKEN
#   TELEGRAM_CHAT_ID
#   CIPIA_DB (default: /opt/cipia/data/veille.db)

set -uo pipefail

# Charger config si present
[ -f /etc/cipia.env ] && source /etc/cipia.env

DB="${CIPIA_DB:-/opt/cipia/data/veille.db}"
BOT="${TELEGRAM_BOT_TOKEN:-}"
CHAT="${TELEGRAM_CHAT_ID:-}"
CACHE_DIR="${VOLUME_ALERT_CACHE:-/tmp/cipia-volume-alerts}"

mkdir -p "$CACHE_DIR"
TODAY=$(date +%Y-%m-%d)

# Sources critiques (cores stables) - on alerte uniquement sur celles-ci
# Les OPCO sectoriels sont intermittents par nature, pas d'alerte.
CRITICAL_SOURCES=("boamp" "jorf" "centre_inffo")

# Seuil : si volume_24h < THRESHOLD * baseline_7j -> alerte
THRESHOLD=0.5

if [ ! -f "$DB" ]; then
  echo "[$(date -Iseconds)] DB introuvable: $DB" >&2
  exit 1
fi

ALERTS=()

for SOURCE in "${CRITICAL_SOURCES[@]}"; do
  # Cache file pour eviter spam (1 alerte/source/jour)
  CACHE="$CACHE_DIR/$SOURCE-$TODAY"
  if [ -f "$CACHE" ]; then
    continue
  fi

  # Volume 24h
  VOLUME_24H=$(sqlite3 "$DB" \
    "SELECT COUNT(*) FROM articles WHERE source = '$SOURCE' AND collected_at >= datetime('now', '-1 day');" \
    2>/dev/null || echo "0")

  # Baseline 7j (moyenne par jour)
  TOTAL_7D=$(sqlite3 "$DB" \
    "SELECT COUNT(*) FROM articles WHERE source = '$SOURCE' AND collected_at >= datetime('now', '-7 days');" \
    2>/dev/null || echo "0")
  BASELINE=$(awk "BEGIN{printf \"%.0f\", $TOTAL_7D/7}")

  # Pas assez d'historique pour comparer
  if [ "$BASELINE" -lt 1 ]; then
    continue
  fi

  # Calcul ratio
  RATIO=$(awk "BEGIN{printf \"%.2f\", $VOLUME_24H/$BASELINE}")

  if awk "BEGIN{exit !($RATIO < $THRESHOLD)}"; then
    # Alerte declenchee
    PCT=$(awk "BEGIN{printf \"%.0f\", $RATIO*100}")
    ALERTS+=("$SOURCE: $VOLUME_24H/24h vs baseline $BASELINE/jour (=$PCT%)")
    touch "$CACHE"
  fi
done

# Si pas d'alerte, exit silencieux
if [ "${#ALERTS[@]}" -eq 0 ]; then
  echo "[$(date -Iseconds)] OK - toutes les sources critiques sont au volume normal."
  exit 0
fi

# Format message Telegram
HOST=$(hostname -s 2>/dev/null || echo "vps")
MSG="⚠️ Cipia [$HOST] - sources sous volume normal :%0A"
for A in "${ALERTS[@]}"; do
  MSG="${MSG}- ${A}%0A"
done
MSG="${MSG}%0AVerifier: https://cipia.fr/dashboard/parametres/sources"

echo "[$(date -Iseconds)] ALERTES : ${ALERTS[*]}"

# Envoi Telegram
if [ -n "$BOT" ] && [ -n "$CHAT" ]; then
  curl -s --max-time 10 \
    "https://api.telegram.org/bot${BOT}/sendMessage" \
    --data-urlencode "chat_id=${CHAT}" \
    --data-urlencode "text=${MSG}" \
    --data-urlencode "parse_mode=Markdown" > /dev/null
  echo "[$(date -Iseconds)] Telegram envoye"
else
  echo "[$(date -Iseconds)] TELEGRAM_BOT_TOKEN/CHAT_ID manquants, alerte non envoyee" >&2
  exit 2
fi
