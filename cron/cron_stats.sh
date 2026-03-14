#!/bin/bash
# Cron job for checking stats
# Usage: ./cron_stats.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Activate virtual environment
source .venv/bin/activate

# Run status check
python main.py status >> logs/cron_stats.log 2>&1
