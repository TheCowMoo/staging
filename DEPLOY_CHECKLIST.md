# Deploy Checklist — Safeguard Audit Platform

Run on the **server** (`ubuntu@ip-172-26-11-162`, app dir `~/staging`). Everything is ordered: **env → schema → build → restart → smoke test**.

> ⚠️ `migrate.runPending` is **disabled in production** (security audit F-01). The app will **not** self-heal schema drift — the schema sync step below is mandatory before restarting the app with new code.

---

## 1. Env secrets (`.env` in ~/staging)

| Var | Required? | Notes |
|-----|-----------|-------|
| `JWT_SECRET` | ✅ **required (≥32 chars)** | Server refuses to start without it in production. `openssl rand -hex 32` |
| `BTAM_ENCRYPTION_KEY` | ⚠️ strongly recommended | Dedicated AES key for BTAM PII. `openssl rand -hex 32`. Falls back to `JWT_SECRET`/cookieSecret if unset (a `[SECURITY]` warning is logged). Set it now so future `JWT_SECRET` rotation can't lock out BTAM data. |
| `RECAPTCHA_SECRET_KEY` | ✅ required | Public login/register/reset fails closed in production without it |
| `DATABASE_URL` | ✅ required | Currently `mysql://root:…@127.0.0.1:3306/safeguard` |
| `VITE_RECAPTCHA_SITE_KEY` | ✅ required | Must match the secret |

```bash
cd ~/staging
# verify each value is set (never echo the values to logs/paste)
grep -c '^JWT_SECRET=.\{32,\}' .env
grep -c '^BTAM_ENCRYPTION_KEY=.\{32,\}' .env
grep -c '^RECAPTCHA_SECRET_KEY=.\{20,\}' .env
```

## 2. Pull & install

```bash
cd ~/staging
git pull
pnpm install   # only if package.json / lockfile changed
```

## 3. Schema sync — BEFORE restarting the app

```bash
cd ~/staging
node scripts/diff-live-schema.mjs --write-fixes   # regenerates drizzle/live_schema_fixes.sql
# REVIEW the generated file (bottom section MODIFY COLUMN can fail on existing data)
mysql -u root -p'Marketingcow1!' -h 127.0.0.1 -P 3306 safeguard < drizzle/live_schema_fixes.sql
```

Then verify the authz-critical pieces exist:

```bash
mysql -u root -p'Marketingcow1!' -h 127.0.0.1 -P 3306 safeguard -e "
  SHOW COLUMNS FROM api_keys;                 -- expect orgId, lastUsedAt, revokedAt, expiresAt
  SHOW TABLES LIKE 'incident_communications'; -- expect the table to exist
  SHOW COLUMNS FROM incident_reports;         -- expect involvedPersonName, isRepeatIncident, ...
  SHOW COLUMNS FROM users;                    -- passwordHash varchar(128) is fine (hash is 110 chars)"
```

> **This deploy also includes the "Anonymous communication" follow-up migration** - `followUpMethod` gains `in_app`:
> ```sql
> ALTER TABLE incident_reports MODIFY COLUMN followUpMethod enum('phone','email','in_person','in_app') NULL;
> ```
> Generated automatically by the `diff-live-schema.mjs` step above; if applying manually, run it before restarting the app.
> **This deploy also includes the California Violent Incident Log (SB 553 / Labor Code §6401.9)** — apply `drizzle/0046_violent_incident_log.sql` (creates the PII-free `violent_incident_logs` + `violent_incident_log_requests` tables). The hourly in-process scheduler (`startViolentLogScheduler`) starts automatically on server boot — no cron job needed. The log has no delete endpoint (5-year retention).

Re-run the diff to confirm it now reports nothing missing:

```bash
node scripts/diff-live-schema.mjs --write-fixes   # second run should produce an empty diff
```

> `ALTER ... ADD COLUMN` is not idempotent — if a statement errors with "Duplicate column name", it means that column already exists; skip it and continue.

## 4. Build & test

```bash
cd ~/staging
npx tsc --noEmit                          # expect exactly 19 PRE-EXISTING errors, 0 new
npx vitest run server/_core/authz.test.ts --pool=threads --poolOptions.threads.singleThread --no-file-parallelism --minWorkers=1 --maxWorkers=1
                                          # expect 24/24 passing
pnpm build
```

## 5. Restart

```bash
pm2 restart safeguard
pm2 logs safeguard --lines 50    # confirm no FATAL/Unknown column errors
```

## 6. Post-deploy smoke tests

- [ ] **Login** with a legacy SHA-256 user → succeeds, and the row is re-hashed to scrypt (no `Data too long` error in logs).
- [ ] **Register / password reset** a test account → succeeds (exercises the new 110-char scrypt write).
- [ ] **Cross-tenant**: user of org A requests a `facilityId`/`auditId`/`photoId`/`incidentId` from org B → `FORBIDDEN` (401 for anonymous).
- [ ] **API keys**: create + list + revoke works (exercises `api_keys.orgId`, `revokedAt`, `expiresAt`).
- [ ] **Incident comms**: open an incident, send an admin message → writes to `incident_communications` without error.
- [ ] **BTAM**: open a case with subject/target PII → displays correctly (decrypt round-trip OK).

## 7. BTAM key migration (one-time, after setting BTAM_ENCRYPTION_KEY)

New rows are encrypted with `BTAM_ENCRYPTION_KEY` (v3); old rows still decrypt via the fallback chain, so nothing breaks. For a clean state, re-encrypt existing rows on the next maintenance window (read → `encryptPII(decryptPII(field))` → write per BTAM table).

## 8. Commit & push

```bash
cd <local repo>            # on your dev machine
git add AI_REFERENCE.md server/_core/authz.ts server/_core/authz.test.ts server/_core/passwords.ts server/_core/env.ts server/btamEncryption.ts server/db.ts server/routers.ts server/incidentCommunicationRouter.ts .env.example DEPLOY_CHECKLIST.md
git commit -m "security: harden authz + credentials per audit (F-02..F-06, DB-layer fixes, BTAM key)"
git push origin main
```
