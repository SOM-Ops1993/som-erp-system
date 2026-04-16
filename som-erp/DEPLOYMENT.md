# SOM ERP — Deployment Guide
## QR Inventory & Production System

---

## PREREQUISITES

| Requirement | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Backend runtime |
| npm | 10+ | Package management |
| PostgreSQL | 16 | Database |
| Docker + Compose | 24+ | Containerised deployment |
| HTTPS certificate | Any | Camera requires HTTPS on mobile |

---

## OPTION A — LOCAL DEVELOPMENT (No Docker)

### Step 1: Clone / Extract the project
```bash
cd som-erp
```

### Step 2: Set up PostgreSQL locally
```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16
createdb som_erp
createuser som_user
psql som_erp -c "ALTER USER som_user WITH PASSWORD 'som_password';"
psql som_erp -c "GRANT ALL PRIVILEGES ON DATABASE som_erp TO som_user;"

# Ubuntu/Debian
sudo apt install postgresql-16
sudo -u postgres createdb som_erp
sudo -u postgres createuser som_user
sudo -u postgres psql -c "ALTER USER som_user WITH PASSWORD 'som_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE som_erp TO som_user;"
```

### Step 3: Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL and other values

npm install
npx prisma generate
npx prisma migrate dev --name init

# Run the custom SQL migration (immutability, triggers, views)
psql $DATABASE_URL -f prisma/migrations/001_immutability_and_indexes.sql

npm run dev
# Backend running at http://localhost:3001
```

### Step 4: Frontend setup
```bash
cd frontend
npm install
npm run dev
# Frontend running at http://localhost:5173
```

### Step 5: Import legacy data
1. Open browser → http://localhost:5173/import
2. Upload your `QR- INVENTORY SYSTEM (9).xlsx`
3. Click "Analyse File" → review preview
4. Click "Confirm & Execute Import"
5. Wait 2–5 minutes
6. Go to Stock Dashboard to verify

---

## OPTION B — DOCKER COMPOSE (Recommended for Production)

### Step 1: Update passwords
Edit `docker-compose.yml` and set:
- `POSTGRES_PASSWORD` — strong password
- `JWT_SECRET` — 64+ random characters
- `FRONTEND_URL` — your actual domain

### Step 2: Add SSL certificates
```bash
mkdir -p nginx/ssl
# Copy your certificate files:
# nginx/ssl/cert.pem
# nginx/ssl/key.pem

# FREE SSL with Let's Encrypt:
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

### Step 3: Enable HTTPS in nginx.conf
Edit `nginx/nginx.conf` — uncomment the HTTPS redirect and add:
```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of config
}
```

### Step 4: Start the system
```bash
docker compose up -d --build

# Watch logs
docker compose logs -f backend

# Run custom SQL migration
docker compose exec backend psql $DATABASE_URL \
  -f prisma/migrations/001_immutability_and_indexes.sql
```

### Step 5: Verify
```bash
# Check all services running
docker compose ps

# Test backend health
curl http://localhost:3001/health

# Test frontend
open http://localhost
```

---

## DATABASE SCHEMA NOTES

### Running custom SQL migration manually
If the Prisma migration doesn't apply the custom SQL automatically:
```bash
psql postgresql://som_user:password@localhost:5432/som_erp \
  -f backend/prisma/migrations/001_immutability_and_indexes.sql
```

This SQL file adds:
- Immutability rules on `stock_ledger` (no UPDATE/DELETE)
- Trigger: validate inward status before insert
- Trigger: auto-update print_master status after inward
- Trigger: auto-update print_master status when pack exhausted
- Function: `get_next_lot_seq()` — atomic lot number generation
- Function: `get_balance_at()` — historical balance query
- View: `v_stock_summary` — stock dashboard view

### Checking the ledger is immutable
```sql
-- This should fail (NOTHING happens due to RULE):
UPDATE stock_ledger SET balance = 0 WHERE ledger_id = 1;
DELETE FROM stock_ledger WHERE ledger_id = 1;
```

---

## MOBILE CAMERA SETUP

**CRITICAL:** The camera API (getUserMedia) requires HTTPS on all mobile browsers.

### For local network / factory floor deployment:
Option 1 — Self-signed cert (shows warning in browser):
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=192.168.1.100"  # Replace with your server IP
```

Option 2 — Use ngrok for HTTPS tunnel (testing):
```bash
ngrok http 5173
# Use the https:// URL provided by ngrok
```

Option 3 — Cloudflare Tunnel (production-grade, free):
```bash
cloudflared tunnel --url http://localhost
```

### Android Chrome:
- Navigate to https://your-server-ip
- Accept the certificate warning
- Allow camera when prompted

### iOS Safari:
- Must use HTTPS (no self-signed cert workaround)
- Use a real SSL certificate or ngrok

---

## SYSTEM ARCHITECTURE

```
Browser (React)
    ↓  HTTPS
Nginx (port 443)
    ↓  HTTP proxy
Fastify Backend (port 3001)
    ↓  Prisma ORM
PostgreSQL 16 (port 5432)
```

---

## ENVIRONMENT VARIABLES

### backend/.env
```env
DATABASE_URL="postgresql://som_user:password@localhost:5432/som_erp"
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://your-domain.com"
JWT_SECRET="64-character-random-string"
```

---

## DATA BACKUP

### Automated backup (add to crontab):
```bash
# Daily backup at 2 AM
0 2 * * * pg_dump -U som_user -d som_erp -F c -f /backups/som_erp_$(date +%Y%m%d).dump

# Restore from backup:
pg_restore -U som_user -d som_erp /backups/som_erp_20260411.dump
```

### Docker volume backup:
```bash
docker run --rm \
  -v som-erp_postgres_data:/data \
  -v $(pwd)/backups:/backups \
  alpine tar czf /backups/db_backup_$(date +%Y%m%d).tar.gz /data
```

---

## POST-DEPLOYMENT CHECKLIST

After deploying and importing legacy data:

- [ ] Stock Dashboard shows all 768 items
- [ ] 236 items show IN_STOCK status
- [ ] Negative stock items are visible (5 items)
- [ ] Print Master shows 4,455 packs
- [ ] 467 packs show AWAITING_INWARD status
- [ ] Generate a test pack (Print Master → select item → generate 1 bag)
- [ ] Download the PDF label — verify 100mm × 50mm format
- [ ] Start an inward session for the test pack
- [ ] Scan the test pack QR → verify it appears in scanned list
- [ ] Submit the inward session
- [ ] Verify stock ledger shows the new entry
- [ ] Camera works on mobile device (HTTPS required)

---

## TROUBLESHOOTING

| Issue | Cause | Fix |
|---|---|---|
| Camera not working | Not on HTTPS | Set up SSL cert or use ngrok |
| `get_next_lot_seq` not found | Custom SQL migration not run | Run 001_immutability... SQL manually |
| Import times out | Large dataset | Increase Prisma timeout in import-service.js (already 300s) |
| Negative balance in ledger | Legacy data integrity | Import is faithful — reconcile in Stock Adjustment module |
| Prisma generate error | schema.prisma changes | Run `npx prisma generate` in backend/ |
| Port 5432 already in use | Local Postgres running | Stop local Postgres or change Docker port |

---

## SUPPORT CONTACTS

System: SOM ERP — QR Inventory & Production System
Built: April 2026
Database: PostgreSQL 16 + Prisma ORM
Backend: Node.js 20 + Fastify 4
Frontend: React 18 + Vite + Tailwind CSS
