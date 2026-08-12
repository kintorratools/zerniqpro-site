# Rollback Runbook V1

## Worker Rollback (Frontend)

```bash
# Roll back to previous Worker deployment
cd zerniqpro-site
pnpm wrangler rollback --config dist-out/server/wrangler.json
```

Or deploy a specific version:

```bash
git checkout <known-good-sha>
pnpm build
pnpm deploy
```

## Container Rollback (CMS)

```bash
# Roll back CMS container to previous deployment
cd product-sites-cms
pnpm wrangler containers rollback <container-name>
```

## PostgreSQL Recovery

```bash
# Restore from latest backup
# 1. Confirm DATABASE_URL is set
# 2. Restore the dump file
pg_restore -d $DATABASE_URL --clean --if-exists D:\Projects\Zerniq\backups\<latest>.dump
```

## R2 Recovery

- R2 objects can be recovered via Cloudflare Dashboard → R2 → bucket → versioning
- Contact Cloudflare support if objects need recovery beyond retention window

## Pre-Rollback Checklist

1. [ ] Confirm current deployment is broken via /api/health.json
2. [ ] Identify last known-good commit SHA
3. [ ] Notify team of rollback
4. [ ] After rollback, verify /api/health.json returns 200
5. [ ] Check admin dashboard is accessible
