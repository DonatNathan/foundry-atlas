# Deploying Foundry Atlas

V1 architecture: **static frontend on Cloudflare Pages**, **API + PostgreSQL on an
Ubuntu VPS**, connected over a **Cloudflare Tunnel** (no open ports, TLS at the edge).

```
Browser
  ├─ map.yourdomain.com   → Cloudflare Pages (static React build)
  └─ api.yourdomain.com   → Cloudflare Tunnel ─► VPS: Node API (localhost:4000) ─► PostgreSQL (localhost)
```

Replace `yourdomain.com` / `map.yourdomain.com` / `api.yourdomain.com` throughout with
your real hostnames. You need your domain on Cloudflare (you do).

---

## Part A — VPS (API + database)

SSH into the VPS as a sudo user.

### 1. Install Node 22 and PostgreSQL

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql git
```

### 2. Create the database and a DB user

```bash
sudo -u postgres psql <<'SQL'
CREATE USER foundry WITH PASSWORD 'CHOOSE_A_STRONG_PASSWORD';
CREATE DATABASE foundry_atlas OWNER foundry;
SQL
```

Postgres stays bound to `localhost` by default — leave it that way (the API talks to
it locally; never expose 5432 publicly).

### 3. Get the code and install server deps

```bash
sudo mkdir -p /opt/foundry-atlas && sudo chown $USER /opt/foundry-atlas
git clone <YOUR_REPO_URL> /opt/foundry-atlas
cd /opt/foundry-atlas/server
npm install --omit=dev
```

### 4. Configure the server environment

```bash
cp .env.example .env
nano .env
```

Set:

```ini
DATABASE_URL=postgres://foundry:CHOOSE_A_STRONG_PASSWORD@localhost:5432/foundry_atlas
ADMIN_TOKEN=<paste output of: openssl rand -hex 32>   # NEW token for prod
CORS_ORIGIN=https://map.yourdomain.com
PORT=4000
```

> Use a **fresh** `ADMIN_TOKEN` for production — don't reuse the dev one.

### 5. Seed the database (once)

```bash
npm run seed   # loads schema + the bundled graph snapshot into Postgres
```

### 6. Run the API under systemd

```bash
# Create a dedicated service user that owns the app dir
sudo useradd --system --no-create-home foundry || true
sudo chown -R foundry /opt/foundry-atlas

sudo cp /opt/foundry-atlas/deploy/foundry-atlas.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now foundry-atlas
sudo systemctl status foundry-atlas      # should be "active (running)"
curl -s localhost:4000/api/graph | head  # should return JSON
```

(Adjust `User=` / paths in the unit file if yours differ.)

### 7. Expose the API with a Cloudflare Tunnel

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login                       # opens a browser auth link
cloudflared tunnel create foundry-atlas        # note the TUNNEL_ID + creds path
cloudflared tunnel route dns foundry-atlas api.yourdomain.com
```

Install the config and run it as a service:

```bash
sudo mkdir -p /etc/cloudflared
sudo cp /opt/foundry-atlas/deploy/cloudflared-config.yml /etc/cloudflared/config.yml
sudo nano /etc/cloudflared/config.yml          # fill in <TUNNEL_ID> and creds path
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Verify from your laptop:

```bash
curl -s https://api.yourdomain.com/api/graph | head   # JSON over HTTPS 🎉
```

### 8. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw enable
```

No inbound ports for the API or Postgres are needed — the tunnel is outbound-only.

---

## Part B — Cloudflare Pages (frontend)

In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
pick this repo, then set:

| Setting | Value |
| --- | --- |
| Framework preset | None / Vite |
| Build command | `npm --prefix frontend install && npm --prefix frontend run build` |
| Build output directory | `frontend/dist` |
| Environment variable | `VITE_API_BASE = https://api.yourdomain.com` |

Deploy, then add your **custom domain** (`map.yourdomain.com`) under the Pages project's
**Custom domains** tab. Cloudflare provisions the TLS cert automatically.

> The `frontend/public/_redirects` file (already in the repo) makes Pages serve
> `index.html` for any path, so deep links / refreshes work.

---

## Verify the whole thing

1. Visit `https://map.yourdomain.com` — the map loads (data comes from the API).
2. Click **Admin → Unlock**, paste your production `ADMIN_TOKEN`, make a tiny edit, and
   confirm it persists across a refresh.
3. Open the browser devtools Network tab — API calls go to `api.yourdomain.com` and
   succeed (no CORS errors).

---

## Updating after a code change

```bash
# Frontend: just push to the repo — Cloudflare Pages rebuilds automatically.

# Backend (on the VPS):
cd /opt/foundry-atlas && sudo -u foundry git pull
cd server && sudo -u foundry npm install --omit=dev
sudo systemctl restart foundry-atlas
```

> Only run `npm run seed` again if you intend to **reset** the database — it drops and
> recreates the tables, wiping admin edits. Schema changes to a live DB should be done
> with a migration, not a reseed.

---

## Backups (recommended)

Daily `pg_dump` to a local file, kept for 14 days:

```bash
sudo crontab -e
# add:
0 3 * * * sudo -u postgres pg_dump foundry_atlas | gzip > /var/backups/foundry-$(date +\%F).sql.gz && find /var/backups -name 'foundry-*.sql.gz' -mtime +14 -delete
```

(Even better: sync the dumps off-box, e.g. to R2/S3.)

---

## Security checklist

- [ ] Fresh `ADMIN_TOKEN` (32+ random bytes), only in the VPS `.env` — never committed.
- [ ] `CORS_ORIGIN` set to exactly your Pages domain (not `*`).
- [ ] Postgres bound to `localhost`; strong DB password.
- [ ] `ufw` allows only SSH; no public API/DB ports (tunnel is outbound).
- [ ] Daily DB backups configured.
- [ ] Keep the VPS patched: `sudo apt update && sudo apt upgrade`.
