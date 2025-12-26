# Deployment & Operations Guide

This guide covers how to deploy, configure, and maintain Chaster in a production environment.

---

## 🏗️ 1. Deployment Method

### A. Docker Compose (Recommended)

The easiest way to run Chaster is via Docker Compose.

**`docker-compose.yml`**:
```yaml
version: '3.8'

services:
  chaster:
    image: chaster:latest
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/prisma/data    # Persist SQLite database
      - ./backups:/app/backups     # Persist backups
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./data/chaster.db
```

**Steps**:
1.  Run `docker-compose up -d --build`.
2.  The application will initialize. **Check logs to get the initial Admin Token**:
    ```bash
    docker-compose logs chaster | grep "Initial Admin Token"
    ```
    *(If you missed it, use the CLI tool inside the container: `docker-compose exec chaster npm run token list`)*.

### B. Manual Node.js Deployment

**Requirements**: Node.js 18+, NPM.

1.  **Clone & Install**:
    ```bash
    git clone ...
    npm install --production
    ```
2.  **Initialize Database**:
    ```bash
    npm run db:init
    # Note down the generated token!
    ```
3.  **Build**:
    ```bash
    npm run build
    ```
4.  **Run with PM2**:
    ```bash
    npm install -g pm2
    pm2 start npm --name "chaster" -- start
    pm2 save
    ```

---

## 🔑 2. Token Management

Chaster uses Bearer Tokens for all API access (including the web Console).

### CLI Management Tool
We provide a built-in CLI tool to manage tokens if you lose access to the UI.

**List all tokens (including secrets):**
```bash
npm run token list
```
*(If using Docker: `docker-compose exec chaster npm run token list`)*

**Force create a new token:**
```bash
npm run token create "Emergency-Token"
```

---

## 💾 3. Database & Backups

### Database Location
By default, Chaster uses SQLite at `prisma/data/chaster.db`.
For high-concurrency production, you can switch to PostgreSQL by updating `prisma/schema.prisma` and `.env`.

### Backup
Run the backup script to archive the database:
```bash
npm run db:backup
```
This creates a timestamped `.gz` file in the `./backups` directory.

### Restore
1.  Stop the application.
2.  Unzip the backup:
    ```bash
    gunzip -c backups/chaster_YYYYMMDD.db.gz > prisma/data/chaster.db
    ```
3.  Restart the application.

---

## ⚙️ 4. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string | `file:./prisma/data/chaster.db` |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Logging verbosity | `info` |

---

## 🛡️ Security Best Practices

1.  **Reverse Proxy**: Always put Nginx or Caddy in front of Chaster to handle SSL/TLS.
2.  **Protect Metrics**: The `/api/v1/stats` endpoint is public currently. In strict environments, block it via Nginx if needed.
3.  **Token Rotation**: Periodically create new tokens and revoke old ones using the Console.
