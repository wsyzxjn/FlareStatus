<div align="center">

# ⚡ FlareStatus

**Apple-style serverless status monitoring with built-in Passkey administration**

An independent status page and uptime monitor for Cloudflare Workers or Tencent EdgeOne Pages. It records real probe history, supports HTTP/keyword and push-heartbeat monitors, exports Prometheus metrics, and protects every management API with WebAuthn Passkeys.

[Live Demo](https://status.amatsuka.net/) • [1-Click Deploy](#-1-click-deploy-to-cloudflare) • [Features](#-key-features) • [Quick Start](#-quick-start) • [Passkey Setup](#-passkey-administrator-setup) • [APIs](#-api-endpoints)

<br/>

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wsyzxjn/FlareStatus)

<br/>

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20KV-F38020?style=flat&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## ✨ Key Features

### 🍏 Apple Minimalist & Glassmorphism Aesthetic
- **Humanist Geometric Typography**: Soft, rounded typography with *Plus Jakarta Sans* & *SF Pro Rounded* font stacks.
- **Cupertino Glassmorphism**: Frosted glass backdrops (`backdrop-blur-xl`), subtle borders, and smooth micro-interactions.
- **Strict Semantic Color Restraint**: Pure monochromatic canvas with color reserved strictly for status semantics (🟢 Operational, 🟡 Degraded, 🔴 Outage, ⚪ Maintenance).
- **Zero-FOUC Dark/Light Modes**: Flawless system preference detection and `localStorage` persistence with zero flash of unstyled theme.
- **Bilingual (i18n)**: One-click Chinese (`zh-CN`) and English (`en`) toggle with synchronized HTML `lang` attributes.

### ⚡ 100% Serverless Edge Architecture
- **Zero Server Costs & Maintenance**: Runs entirely on Cloudflare Workers, Workers KV, and Static Assets.
- **Scheduled Edge Probing**: Probes configured endpoints every 2 minutes through platform cron triggers (`*/2 * * * *`).
- **Persisted Telemetry**: Stores real 24-hour samples and 90-day daily aggregates instead of generating synthetic uptime.

### 🎯 Monitoring
- **Monitor Types**:
  - **HTTP(s) Status Codes**: Configurable accepted status codes (e.g. `200-299, 301, 302`).
  - **Keyword Matching**: Ensures response body contains critical keywords.
  - **Passive Push Heartbeats (Cron Monitors)**: Heartbeat monitor (`/api/push/:token`) for batch jobs, backup scripts, and internal daemons.
  - **Inverted / Upside-Down Mode**: Triggers alerts if an endpoint becomes unexpectedly accessible.
- Notification channel configuration is stored by the admin UI, but outbound notification delivery is not implemented yet.

### 🛡️ Passkey Admin Portal
- **macOS System Settings Style Admin Panel**: Manage services, custom categories, incident broadcasts, and alert channels.
- **Independent Authentication**: WebAuthn registration and login using Touch ID, Face ID, Windows Hello, Android screen lock, or a FIDO2 security key.
- **Protected APIs**: Every `/api/admin/*` route requires a server-side session backed by an HttpOnly, Secure, SameSite cookie.
- **Data Management & Danger Zone**: One-click master reset or modular clearing of services, incidents, or notification channels.

### 📊 Integrations & Developer Tools
- **Prometheus Metrics**: Ready-to-scrape `/metrics` endpoint with Prometheus exposition format.
- **SVG Status Badges**: Dynamic shields for GitHub READMEs (`/api/badge/:serviceId` and `/api/badge/overall`).
- **JSON Status Feed**: Public programmatic feed at `/api/status`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React.
- **Backend / Edge**: Cloudflare Workers, Workers KV, Worker Cron Triggers, Single-Page Application (SPA) Static Assets.
- **Security**: WebAuthn Passkeys with a one-time deployment setup token.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js `>= 22.13` and `pnpm`
- A Cloudflare account and the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)

### 2. Clone & Install
```bash
git clone https://github.com/wsyzxjn/FlareStatus.git
cd FlareStatus
pnpm install
```

### 3. Local Development
```bash
pnpm dev
```
- Open [http://localhost:3000/](http://localhost:3000/) for the public status page.
- Open [http://localhost:3000/admin](http://localhost:3000/admin) for the Admin Console (built-in local dev mock API).

---

## ☁️ Deployment Guide

### ⚡ 1-Click Deploy to Cloudflare Workers

Deploy your own instance of FlareStatus with one click:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wsyzxjn/FlareStatus)

1. Click the **Deploy to Cloudflare Workers** button above.
2. Authorize Cloudflare with your GitHub account to automatically fork and link the repository.
3. Cloudflare will automatically provision your Worker, build the frontend assets, and deploy to your edge subdomain (`*.workers.dev`).
4. Configure `ADMIN_SETUP_TOKEN` as a secret before opening the admin console for the first time.

---

### 🛠️ CLI Manual Deployment via Wrangler

If you prefer full control over custom domains and KV namespaces:

#### 1. Create a Cloudflare KV Namespace
```bash
npx wrangler kv namespace create STATUS_KV
```

Copy the returned `id` into `wrangler.jsonc`:
```jsonc
{
  "name": "flare-status",
  "main": "worker/index.ts",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  },
  "triggers": {
    "crons": ["*/2 * * * *"]
  },
  "kv_namespaces": [
    {
      "binding": "STATUS_KV",
      "id": "<YOUR_KV_NAMESPACE_ID>"
    }
  ]
}
```

#### 2. Configure the first-time setup token
```bash
pnpm wrangler secret put ADMIN_SETUP_TOKEN
```

Use a long random value. It is accepted only while no Passkey exists for the current domain.

#### 3. Build & Deploy
```bash
pnpm build
pnpm wrangler deploy
```

#### 4. Bind Your Custom Domain
To bind a custom domain like `status.yourdomain.com`:
Add a route in `wrangler.jsonc`:
```jsonc
"routes": [
  {
    "pattern": "status.yourdomain.com",
    "custom_domain": true
  }
]
```
Then run `npx wrangler deploy`.

---

### 🌐 Deploying to Tencent EdgeOne Pages (Makers)

FlareStatus runs natively on **Tencent EdgeOne Pages (Makers)** using Node.js Cloud Functions, Built-in Blob Storage (`@edgeone/pages-blob`), and Scheduled Cron:

1. Log in to the [Tencent EdgeOne Pages Console](https://console.cloud.tencent.com/edgeone/pages) (or [EdgeOne Makers](https://pages.edgeone.ai/)).
2. **Connect Git & Deploy**:
   - Click **Add Project** -> **Import from GitHub** -> Select your `FlareStatus` repository.
   - The platform will automatically detect `edgeone.json`, run the Vite build, mount Cloud Functions (`./cloud-functions/api/`), initialize EdgeOne Blob Storage (`@edgeone/pages-blob`), and schedule the 2-minute Cron trigger (`*/2 * * * *`).
   - Add a secret environment variable named `ADMIN_SETUP_TOKEN` before first visiting `/admin`.
3. **Or Deploy via CLI**:
   ```bash
   edgeone makers deploy -n flare-status
   ```
4. **Bind Custom Domain**:
   - Add your custom domain in the project settings for automatic EdgeOne Anycast CDN acceleration and free SSL.

---

## 🔒 Passkey Administrator Setup

1. Deploy with a secret `ADMIN_SETUP_TOKEN` environment variable.
2. Open `/admin` on the final HTTPS domain and enter that token.
3. Register a Passkey using the browser's native prompt.
4. Remove or rotate `ADMIN_SETUP_TOKEN` after registration. Existing Passkeys continue to work.

Passkeys are scoped to the hostname used during registration. If the administration hostname changes, configure a setup token and register a new Passkey on the new hostname before removing the old deployment.

---

## 📡 API Endpoints

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/status` | `GET` | Public status feed (JSON) with real-time metrics and service states |
| `/api/push/:token` | `GET/POST` | Passive push heartbeat check-in for cron jobs |
| `/api/badge/:serviceId` | `GET` | SVG status badge for GitHub READMEs (`overall` or service ID) |
| `/metrics` | `GET` | Prometheus metrics exposition format |
| `/api/auth/session` | `GET` | Current Passkey session and setup status |
| `/api/auth/register/*` | `POST` | First-time Passkey registration flow |
| `/api/auth/login/*` | `POST` | Passkey authentication flow |
| `/api/admin/data` | `GET` | Full admin configuration and active probes |
| `/api/admin/services` | `POST` | Update and save monitored services |
| `/api/admin/categories` | `POST` | Update custom categories |
| `/api/admin/incidents` | `POST` | Publish or update incident notices |
| `/api/admin/notifications` | `POST` | Save alert channels and templates |
| `/api/admin/clear-data` | `POST` | Clear or reset KV database |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
