#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
  echo "created $SCRIPT_DIR/.env from .env.example" >&2
fi

if [ ! -d "node_modules" ]; then
  npm install
fi

echo "running migrations..." >&2
npm run migrate -- --reset
