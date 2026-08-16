# MongoDB Backup Strategy

## TL;DR

**Production MUST have backups.** Choose ONE:

1. **Recommended (cheap + automatic)**: Upgrade to Atlas M2+ ($9/mo) — automatic snapshots + point-in-time recovery
2. **Fallback (free + manual)**: Run weekly cron job `./scripts/backup-mongodb.sh` (Atlas M0 + manual S3/B2 dump)

Without backups, a single bad migration / accidental delete / cluster loss = PERMANENT data loss. See incident 2025-10-26 (`.claude/rules/data-protection.md`).

---

## Option 1: Atlas M2+ Upgrade (recommended, $9/mo)

### Steps

1. Login to https://cloud.mongodb.com/
2. Select cluster → "Edit Configuration"
3. Choose tier M2 ($9/mo) or M5 ($25/mo) for higher RAM
4. Enable "Continuous Cloud Backup" (automatic, 24h interval, point-in-time recovery up to 7 days)
5. Set backup retention: 7 days (M2) / 30 days (M5+)

### What you get

- Automatic snapshots every 24h
- Point-in-time recovery (rewind to any second within 7 days)
- Restore to a new cluster (test before overwriting prod)
- No code changes needed

### Cost

- M2: $9/mo per cluster (sufficient for < 100K users)
- M5: $25/mo (recommended once you have paying customers)

---

## Option 2: Manual cron backup (free, fragile)

If you cannot afford M2 yet, run the manual backup script weekly.

### Setup

1. Install `mongodump` (part of MongoDB Database Tools): https://www.mongodb.com/docs/database-tools/installation/installation/
2. Create AWS S3 bucket OR Backblaze B2 bucket (B2 is cheaper, ~$5/TB) OR Scaleway / OVH S3-compatible
3. Add to `.env.production`:

   ```
   MONGO_URL=mongodb+srv://...
   S3_BUCKET=ezstart-mongo-backups
   S3_ACCESS_KEY=...
   S3_SECRET_KEY=...
   S3_ENDPOINT=https://s3.fr-par.scw.cloud  # Scaleway, OVH, AWS, B2 endpoint
   ```

4. Test the script: `./scripts/backup-mongodb.sh`
5. Add cron entry on a server (or use the GitHub Actions scheduled workflow — see `.github/workflows/mongo-backup.yml`):

   ```cron
   0 3 * * 0 /path/to/scripts/backup-mongodb.sh >> /var/log/mongo-backup.log 2>&1
   ```

   (Sunday 3am UTC weekly)

### Limitations

- Manual restore process (mongorestore from S3 dump)
- 1-week granularity (no point-in-time recovery)
- If the cron fails silently, you don't know
- Backup script must be tested at least once a quarter (drill)

---

## Option 3: GitHub Actions scheduled workflow

A ready-to-use workflow ships at `.github/workflows/mongo-backup.yml`. It runs every Sunday at 3am UTC and can be manually triggered via `workflow_dispatch`.

### Setup

Add the following secrets in **Repo Settings → Secrets and variables → Actions**:

- `MONGO_URL_PROD` — production MongoDB URI
- `S3_BUCKET` — bucket name
- `S3_ACCESS_KEY` — S3-compatible access key
- `S3_SECRET_KEY` — S3-compatible secret key
- `S3_ENDPOINT` — S3 endpoint URL (e.g. `https://s3.fr-par.scw.cloud`)

The workflow installs `mongodump` and the AWS CLI, then invokes `./scripts/backup-mongodb.sh`. Manually trigger once via the **Actions** tab to confirm the setup before relying on the schedule.

---

## Restore drill (quarterly)

You don't have backups until you've successfully restored from one. Schedule a quarterly drill:

1. Spin up a new MongoDB instance (Atlas M0 free)
2. Run `mongorestore` from latest backup
3. Verify document counts match production
4. Document the restore time (RTO) — should be < 4h

If the drill fails, your "backup" is fiction.

### Restore command reference

```bash
# Pull the latest archive from S3
aws --endpoint-url="$S3_ENDPOINT" s3 cp \
  "s3://$S3_BUCKET/mongo-backup-2026-05-01T03-00-00Z.tar.gz" \
  /tmp/restore.tar.gz

# Extract
tar -xzf /tmp/restore.tar.gz -C /tmp/

# Restore to a NEW cluster (NEVER overwrite prod blindly)
mongorestore --uri="$RESTORE_TARGET_URL" --gzip /tmp/mongo-backup-*/

# Verify document counts vs prod before promoting
```

---

## Compliance notes

- GDPR Article 32 requires "appropriate technical measures" for data security — backups are part of this
- Without backups, GDPR data deletion requests cannot be safely processed (no rollback)
- Data Processing Agreements (DPA) with EU customers usually mandate backup retention policy

---

## Related

- [`.claude/rules/data-protection.md`](./.claude/rules/data-protection.md) — production data safety rules + incident 2025-10-26 reference
- [`.claude/rules/standard-saas-data.md`](./.claude/rules/standard-saas-data.md) §6 — backups checklist (P0 / P1 / P2)
- [`scripts/backup-mongodb.sh`](./scripts/backup-mongodb.sh) — manual backup script
- [`.github/workflows/mongo-backup.yml`](./.github/workflows/mongo-backup.yml) — scheduled workflow alternative
