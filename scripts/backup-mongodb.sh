#!/usr/bin/env bash
#
# Backup MongoDB to S3-compatible storage (AWS S3, Scaleway, OVH, Backblaze B2, ...).
#
# Requires:
#   - mongodump  (https://www.mongodb.com/docs/database-tools/installation/installation/)
#   - aws CLI    (https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
#
# Usage:
#   ./scripts/backup-mongodb.sh
#
# Env vars (loaded from .env.production if present, else from environment):
#   MONGO_URL       - production MongoDB URI (required)
#   S3_BUCKET       - target bucket name (required)
#   S3_ACCESS_KEY   - S3-compatible access key (required)
#   S3_SECRET_KEY   - S3-compatible secret key (required)
#   S3_ENDPOINT     - S3 endpoint URL (default: https://s3.amazonaws.com)
#
# Retention: keeps the 12 most recent backups in the bucket. Older entries are deleted.
#
# See MONGODB_BACKUP.md for the full strategy and restore procedure.

set -euo pipefail

# Load env vars from .env.production if present (POSIX-compatible parser).
if [ -f .env.production ]; then
  # Strip comments and blank lines, then export each KEY=VALUE pair.
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
fi

# Validate required env vars.
: "${MONGO_URL:?MONGO_URL must be set}"
: "${S3_BUCKET:?S3_BUCKET must be set}"
: "${S3_ACCESS_KEY:?S3_ACCESS_KEY must be set}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY must be set}"

S3_ENDPOINT="${S3_ENDPOINT:-https://s3.amazonaws.com}"

# Use UTC, ISO-8601-safe timestamp (filesystem-friendly: dashes only).
TIMESTAMP=$(date -u +'%Y-%m-%dT%H-%M-%SZ')
BACKUP_DIR="/tmp/mongo-backup-${TIMESTAMP}"
ARCHIVE_PATH="/tmp/mongo-backup-${TIMESTAMP}.tar.gz"
S3_KEY="mongo-backup-${TIMESTAMP}.tar.gz"

# Ensure cleanup on early exit (signal handlers + normal exit).
cleanup() {
  rm -rf "${BACKUP_DIR}" "${ARCHIVE_PATH}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Starting backup to ${BACKUP_DIR}"

# 1. Dump the database (gzip on the fly to reduce disk usage).
mkdir -p "${BACKUP_DIR}"
mongodump --uri="${MONGO_URL}" --out="${BACKUP_DIR}" --gzip

# 2. Compress the dump tree into a single archive.
tar -czf "${ARCHIVE_PATH}" -C "$(dirname "${BACKUP_DIR}")" "$(basename "${BACKUP_DIR}")"

ARCHIVE_SIZE=$(du -h "${ARCHIVE_PATH}" | cut -f1)
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Archive built: ${ARCHIVE_PATH} (${ARCHIVE_SIZE})"

# 3. Upload to S3.
AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}" \
AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}" \
  aws --endpoint-url="${S3_ENDPOINT}" s3 cp "${ARCHIVE_PATH}" "s3://${S3_BUCKET}/${S3_KEY}"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Uploaded to s3://${S3_BUCKET}/${S3_KEY}"

# 4. Retention: keep the 12 most recent backups (~ 3 months of weekly dumps).
#    `aws s3 ls` output: "YYYY-MM-DD HH:MM:SS  SIZE  KEY"
AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}" \
AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}" \
  aws --endpoint-url="${S3_ENDPOINT}" s3 ls "s3://${S3_BUCKET}/" \
  | awk '{print $4}' \
  | grep -E '^mongo-backup-.*\.tar\.gz$' \
  | sort -r \
  | tail -n +13 \
  | while IFS= read -r OLD_KEY; do
      [ -z "${OLD_KEY}" ] && continue
      echo "Deleting old backup: ${OLD_KEY}"
      AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}" \
      AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}" \
        aws --endpoint-url="${S3_ENDPOINT}" s3 rm "s3://${S3_BUCKET}/${OLD_KEY}"
    done

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Backup complete: s3://${S3_BUCKET}/${S3_KEY}"
