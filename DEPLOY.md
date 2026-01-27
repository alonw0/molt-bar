# Deployment Guide

## Deployment Options

### Option 1: Fly.io (Recommended)

Fly.io has native Bun support and handles long-running connections well.

**Pros**: Easy setup, global edge deployment, persistent volumes for SQLite
**Cons**: Paid after free tier

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Initialize (from server/ directory)
cd server
fly launch

# Deploy
fly deploy
```

**fly.toml**:
```toml
app = "clawd-bar"
primary_region = "iad"

[build]
  builder = "oven/bun"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true

[mounts]
  source = "data"
  destination = "/app/data"
```

---

### Option 2: Railway

Railway supports Bun and has simple deployment.

**Pros**: GitHub integration, easy scaling
**Cons**: No persistent volumes on free tier

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**railway.json**:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "runtime": "bun",
    "startCommand": "bun run src/index.ts"
  }
}
```

---

### Option 3: DigitalOcean App Platform

**Pros**: Managed platform, good uptime
**Cons**: More expensive, manual Bun setup

1. Create new App from GitHub repo
2. Set build command: `cd server && bun install`
3. Set run command: `cd server && bun run src/index.ts`
4. Add persistent volume for `/app/server/data`

---

### Option 4: VPS (Manual)

For full control, deploy on a VPS (DigitalOcean, Linode, Hetzner).

```bash
# On server
curl -fsSL https://bun.sh/install | bash
git clone <repo> /opt/clawd-bar
cd /opt/clawd-bar/server
bun install
```

**systemd service** (`/etc/systemd/system/clawd-bar.service`):
```ini
[Unit]
Description=Clawd Bar
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/clawd-bar/server
ExecStart=/root/.bun/bin/bun run src/index.ts
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable clawd-bar
sudo systemctl start clawd-bar
```

**nginx reverse proxy** (`/etc/nginx/sites-available/clawd-bar`):
```nginx
server {
    listen 80;
    server_name clawd.bar;

    location / {
        proxy_pass http://127.0.0.1:3847;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE support
        proxy_set_header X-Accel-Buffering no;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
```

---

### Option 5: Docker

**Dockerfile**:
```dockerfile
FROM oven/bun:1

WORKDIR /app

# Copy server
COPY server/package.json server/bun.lockb ./server/
RUN cd server && bun install --frozen-lockfile

COPY server ./server
COPY website ./website

WORKDIR /app/server

# Create data directory
RUN mkdir -p data

EXPOSE 3847

CMD ["bun", "run", "src/index.ts"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  clawd-bar:
    build: .
    ports:
      - "3847:3847"
    volumes:
      - clawd-data:/app/server/data
    restart: unless-stopped

volumes:
  clawd-data:
```

```bash
docker-compose up -d
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3847` | Server port |
| `NODE_ENV` | `development` | Environment mode |

---

## Pre-deployment Checklist

- [ ] Update CORS settings for production domain
- [ ] Set up SSL/TLS (Let's Encrypt)
- [ ] Configure persistent storage for SQLite
- [ ] Set up monitoring/logging
- [ ] Configure backup for database
- [ ] Test SSE connections through reverse proxy
- [ ] Update skill documentation with production URL

---

## Database Backup

SQLite database is at `server/data/bar.db`. For backups:

```bash
# Manual backup
cp server/data/bar.db server/data/bar.db.backup

# Automated backup (cron)
0 * * * * cp /opt/clawd-bar/server/data/bar.db /backups/bar-$(date +\%Y\%m\%d-\%H).db
```

---

## Monitoring

### Health Check

```bash
curl https://your-domain.com/health
# {"status":"ok"}
```

### Uptime Monitoring

Set up monitoring with:
- UptimeRobot (free)
- Pingdom
- Better Uptime

Monitor endpoint: `GET /health`

---

## Scaling Considerations

### Current Limitations

- SQLite is single-node only
- SSE connections are memory-bound
- No horizontal scaling without database change

### Future Scaling

For multi-instance deployment:
1. Replace SQLite with PostgreSQL
2. Use Redis for SSE pub/sub
3. Add load balancer with sticky sessions

---

## Rollback

```bash
# If using Git deployment
git revert HEAD
git push

# If using Docker
docker-compose down
docker-compose up -d --build
```
