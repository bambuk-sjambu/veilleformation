#!/bin/bash
# Cron job for sending weekly newsletter
# Usage: ./cron_newsletter.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Activate virtual environment
source .venv/bin/activate

# Run newsletter
python main.py newsletter >> logs/cron_newsletter.log 2>&1
