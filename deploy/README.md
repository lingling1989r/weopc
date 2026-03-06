# Production Deployment

This project can auto-deploy on every push to `main` through GitHub Actions.

## Flow

1. GitHub Actions runs CI.
2. If CI passes on `main`, Actions connects to the server over SSH.
3. The server runs `deploy/deploy.sh`.
4. The script updates code, runs Prisma migrations, rebuilds apps, and reloads PM2.

## Required GitHub Secrets

Create these repository secrets:

- `DEPLOY_HOST`: server IP or host, for example `47.107.250.96`
- `DEPLOY_PORT`: SSH port, usually `22`
- `DEPLOY_USER`: deployment user, for example `weopc`
- `DEPLOY_SSH_KEY`: private SSH key content used by GitHub Actions

## Required Server Layout

Expected app directory:

- `/home/weopc/weopc`

Expected files:

- `/home/weopc/weopc/apps/api/.env.production`
- `/home/weopc/weopc/apps/web/.env.production`

## API Environment Example

```env
PORT=3002
NODE_ENV=production
DATABASE_URL=postgresql://weopc:change-me@127.0.0.1:5432/weopc?schema=public
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Web Environment Example

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
```

## First-Time Server Setup

1. Run `deploy/bootstrap-server.sh` as root on the server.
2. Add your local SSH public key into `/home/weopc/.ssh/authorized_keys`.
3. Switch to `weopc`, clone the repository into `/home/weopc/weopc`.
4. Start PostgreSQL and Redis from `tools/docker/docker-compose.yml`.
5. Create the two `.env.production` files.
6. Run `deploy/deploy.sh` once manually.
7. Configure Nginx to reverse proxy web and api.
8. Add GitHub Actions secrets.

## Nginx Reverse Proxy Suggestion

- `/` -> `http://127.0.0.1:3003`
- `/api/` -> `http://127.0.0.1:3002/api/`

## Notes

- `deploy/deploy.sh` uses `git reset --hard origin/main`, so the server repo should not contain manual uncommitted changes.
- Prisma deploy uses committed migrations only.
- PM2 process names are `weopc-api` and `weopc-web`.
