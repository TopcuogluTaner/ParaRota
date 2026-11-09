#!/usr/bin/env bash
# ParaRota — PostgreSQL yedeği → OCI Object Storage
# VM'de cron ile çalıştır (örn. her gün 04:00):
#   0 4 * * *  /home/ubuntu/ParaRota/deploy/scripts/backup.sh >> /var/log/pararota-backup.log 2>&1
#
# Gereksinim: OCI CLI VM'de kurulu + yetkili (instance principal ya da config),
#             bir Object Storage bucket: pararota-backups
set -euo pipefail

BUCKET="pararota-backups"
NS="$(oci os ns get --query 'data' --raw-output)"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="pararota-${STAMP}.sql.gz"
TMP="/tmp/${FILE}"
RETENTION_DAYS=14

echo "[$(date)] dump alınıyor → $TMP"
docker exec pararota-postgres pg_dump -U "${POSTGRES_USER:-pararota}" "${POSTGRES_DB:-pararota}" \
  | gzip > "$TMP"

echo "[$(date)] Object Storage'a yükleniyor (bucket: $BUCKET)"
oci os object put --bucket-name "$BUCKET" --namespace "$NS" \
  --file "$TMP" --name "$FILE" --force

rm -f "$TMP"

echo "[$(date)] $RETENTION_DAYS günden eski yedekleri sil"
CUTOFF=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)
oci os object list --bucket-name "$BUCKET" --namespace "$NS" --query 'data[].name' --raw-output 2>/dev/null \
  | tr -d '[]," ' | grep -E '^pararota-' | while read -r obj; do
      objdate=$(echo "$obj" | sed -E 's/pararota-([0-9]{8})-.*/\1/')
      if [ -n "$objdate" ] && [ "$objdate" -lt "$CUTOFF" ]; then
        echo "  siliniyor: $obj"
        oci os object delete --bucket-name "$BUCKET" --namespace "$NS" --object-name "$obj" --force
      fi
    done

echo "[$(date)] ✅ yedek tamam: $FILE"
