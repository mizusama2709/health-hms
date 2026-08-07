#!/usr/bin/env bash
# Restores a scripts/backup-db.sh dump into DATABASE_URL. Destructive —
# --clean drops existing objects before recreating them — so this asks for
# an explicit "yes" unless FORCE=1 is set (e.g. for a scripted DR drill).
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set — source your .env.local first." >&2
  exit 1
fi

DUMP_FILE="${1:-}"
if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Usage: DATABASE_URL=... scripts/restore-db.sh <path-to-dump-file>" >&2
  exit 1
fi

if [ "${FORCE:-0}" != "1" ]; then
  echo "This will DROP and recreate objects in the database at:"
  echo "  $DATABASE_URL"
  echo "using: $DUMP_FILE"
  read -r -p "Type 'yes' to continue: " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner --no-privileges "$DUMP_FILE"
echo "Restore complete."
