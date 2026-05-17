# hlquery analytics service

Express + Sequelize service that receives hlquery `m_analytics` payloads, enriches events with GeoIP country, stores them in SQL, and serves a small dashboard.

## Quick start (MySQL)

```bash
cd etc/analytics
npm install
cp .env.example .env
npm run migrate
npm start
```

## Dashboard login

By default, the dashboard requires login.

1) Set `ANALYTICS_SESSION_SECRET` in `.env`
2) Run migrations (adds `analytics_app_users`)
3) Bootstrap the first admin user once:

```bash
curl -X POST http://127.0.0.1:8090/api/auth/bootstrap \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"change-me"}'
```

After that, sign in at `/login` and manage users in **Admin → App Users**.

```sql
INSERT INTO analytics_app_users (username, passwordSalt, passwordHash, role, createdAt)
VALUES ('admin', '<salt-hex>', '<hash-hex>', 'admin', NOW());
```

Password hashing uses `scrypt(password, salt)` (salt is 32 random bytes, hex-encoded; hash is 64 bytes, hex-encoded).

To skip login entirely, set:

```bash
AUTOLOGIN=1
```

When `AUTOLOGIN=1`, the UI/API skip auth, and app-user management endpoints are disabled.

## Install (standalone repo)

Clone via SSH:

```bash
git clone git@github.com:hlquery/analytics.git
cd analytics
cp .env.example .env
npm install
npm run migrate
npm start
```

Create the MySQL database first (example):

```sql
CREATE DATABASE hlquery_analytics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Configure hlquery

Set an endpoint in `hlquery.conf` (or equivalent config):

```ini
[analytics]
endpoint = http://127.0.0.1:8090/v1/analytics/hlquery
api_token = your-shared-token
flush_interval = 60
```

If you set `api_token`, also set `ANALYTICS_API_TOKEN` in this service.

## Endpoints

- `POST /v1/analytics/hlquery` ingest payloads from `m_analytics`
- `GET /health` health + db connectivity
- `GET /` Vue dashboard (after building `etc/analytics/web`)
- `GET /events` Vue events table (after building `etc/analytics/web`)
- `GET /searches` Vue searches table (after building `etc/analytics/web`)
- `GET /visitors` Vue unique visitors view (after building `etc/analytics/web`)
- `GET /api/stats` JSON stats for dashboard
- `GET /api/events` JSON events (filters + pagination)
- `GET /api/searches` JSON searches (filters + pagination)
- `GET /api/visitors` JSON unique visitors (by country, based on unique requester IP hashes)
- `POST /api/hlquery/refresh` triggers `POST /modules/analytics/flush` on hlquery (requires `HLQUERY_URL`)

## Web UI (Vue + Vuetify)

Dev (runs on port 5178, proxies `/api` to backend):

```bash
etc/analytics/install.sh   # drops tables + re-runs migrations
etc/scripts/x888 dev
etc/scripts/x888 web:dev
```

Build and serve from Express:

```bash
etc/scripts/x888 web:build
etc/scripts/x888 start
```

## Force refresh (dashboard)

To enable the "force refresh" button in the dashboard, set:

```bash
HLQUERY_URL=http://127.0.0.1:9200
# optional, if hlquery requires auth
HLQUERY_API_TOKEN=your-hlquery-api-token
```
