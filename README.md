# Chaster - Timelock Encryption Service

**Chaster** is a production-ready, self-hosted timelock encryption service. It allows you to encrypt data (text or images) that can only be decrypted after a specific time in the future. It relies on the [drand](https://drand.love/) decentralized random beacon network for trustless time-keeping.

> **New in v1.0**: Transformed from a single-user app to a full-featured API service with an Admin Console.

![Chaster Dashboard](/docs/images/dashboard-preview.png)

## ✨ Key Features

*   **🛡️ Service-Oriented Architecture**: robust RESTful API for integration with other apps.
*   **🔑 Secure Authentication**: Bearer Token authentication with granular management.
*   **🖥️ Admin Console**: Modern web dashboard to manage items, tokens, and view statistics.
*   **🔒 Trustless Encryption**: Mathematical guarantee that data cannot be decrypted before the timer expires.
*   **💾 Flexible Storage**: SQLite (default) for ease of use, extendable to PostgreSQL/MySQL via Prisma.
*   **🐳 Production Ready**: Docker support, structured logging, and database backup tools included.

## 🚀 Quick Start

### Method 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/chaster.git
cd chaster

# Start with Docker Compose
docker-compose up -d

# Open Console
# Visit http://localhost:3000/console
```

### Method 2: Manual Installation

```bash
# Install dependencies
npm install

# Initialize Database & Generate Admin Token
npm run db:init
# (Copy the generated token from the output!)

# Build & Start
npm run build
npm start
```

## 📖 Documentation

*   **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: Detailed instructions for Docker, PM2, and Nginx.
*   **[API Reference](docs/API_REFERENCE.md)**: How to use the REST API.
*   **[Interactive API Docs](/api/docs)**: Swagger UI (runs locally at `/api/docs`).
*   **[Product Requirements (PRD)](docs/PRD.md)**: Architecture and design details.
*   **[Testing & QA](docs/TESTING.md)**: Strategy for Unit, Integration, and Stress tests.

## 🛠️ Configuration

Create a `.env` file based on `.env.example`:

```env
# Database (Defaults to local SQLite)
DATABASE_URL="file:./prisma/data/chaster.db"

# Console Security
# (Generated automatically by db:init)
```

## 🔧 Management Tools

### API Tokens
If you lose your API tokens or lock yourself out, access the server terminal and run:

```bash
# List all tokens
npm run token list

# Create a new emergency token
npm run token create "Emergency-Admin"
```

### Database Backup
```bash
# Create a backup timestamped zip in ./backups/
npm run db:backup
```

## 🛣️ Roadmap

*   [x] REST API v1
*   [x] Admin Console
*   [x] Token Management
*   [x] Docker Support
*   [ ] Multi-user Tenants (Planned)
*   [ ] Webhook Notifications (Planned)

## 📄 License

MIT License.
