# 🔥 Fireball Board

Bourbon game manager — duck lists, fireball templates, inventory tracking, sales log.

## Stack
- Vite + React
- Supabase (Postgres)
- GitHub Pages (auto-deploy via Actions)

---

## Setup

### 1. Supabase

1. Go to your Supabase project → **SQL Editor**
2. Paste and run the contents of `schema.sql`
3. This creates both tables and seeds your inventory

### 2. Local dev

```bash
git clone https://github.com/chadspencer/bourbon.git
cd bourbon
npm install
cp .env.example .env
# Edit .env and add your Supabase URL and anon key
npm run dev
```

### 3. GitHub Secrets (for deploy)

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | `https://xivzrjbvulkurnykminb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your anon key |

### 4. Enable GitHub Pages

In your repo → **Settings → Pages**:
- Source: **GitHub Actions**

### 5. Push to deploy

```bash
git add .
git commit -m "init"
git push origin main
```

Your app will be live at: **https://chadspencer.github.io/bourbon/**

---

## Features

- 🎮 **Game** — Single or Multi (4 bottle) games, two-price toggle, auto-calculates sip price, generates fireball template + duck list, logs sale and decrements inventory on end
- 🦆 **Ducks** — Standalone duck list generator
- 📦 **Inventory** — Edit bottles, add new ones, CSV export
- 📋 **Sales** — Full sales history with totals
