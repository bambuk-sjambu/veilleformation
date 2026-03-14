#!/bin/bash
# Cron job for collecting articles
# Usage: ./cron_collect.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Activate virtual environment
source .venv/bin/activate

# Run collection
python main.py collect >> logs/cron_collect.log 2>&1
