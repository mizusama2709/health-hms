#!/usr/bin/env bash
# Encrypted-at-rest custom-format pg_dump, timestamped. Run manually or on a
# schedule (cron/CI); restore with scripts/restore-db.sh against the same
# DATABASE_URL. Compliance note: the resulting file contains the same PHI
# the live database does — it must live somewhere with equivalent access
# controls and encryption (a private, encrypted bucket, never committed to
# git — see .gitignore), and old backups should be purged per your
# retention policy, not kept indefinitely.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set — source your .env.local first." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
OUT_FILE="$BACKUP_DIR/health-hms-$TIMESTAMP.dump"

pg_dump "$DATABASE_URL" --format=custom --file="$OUT_FILE"

SIZE=$(du -h "$OUT_FILE" | cut -f1)
echo "Backup written: $OUT_FILE ($SIZE)"
