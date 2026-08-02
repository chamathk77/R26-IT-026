# SmartCost POS

Point-of-sale platform with an Express API, Next.js admin dashboard, and Expo mobile app.

## Project structure

| Directory   | Stack              | Description                    |
| ----------- | ------------------ | ------------------------------ |
| `backend/`  | Node.js, Express   | REST API, MongoDB, cron jobs   |
| `dashboard/`| Next.js, MUI       | Web admin dashboard (port 3001)|
| `fontend/`  | Expo, React Native | Mobile POS app                 |

## Prerequisites

- Node.js 20+
- npm
- MongoDB (connection string in backend env)
- For mobile: Expo Go or a dev build (iOS/Android)

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with MongoDB URI, JWT_SECRET, SMS keys, etc.
npm install
npm run dev
```

API runs at `http://localhost:3000` by default.

### 2. Dashboard

```bash
cd dashboard
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
npm install
npm run dev
```

Dashboard runs at `http://localhost:3001`.

### 3. Mobile app (`fontend/`)

```bash
cd fontend
cp .env.example .env
# Set EXPO_PUBLIC_BASE_URL to your machine LAN IP when testing on a device
npm install
npm start
```

## Environment files

| App        | Template              | Local file     |
| ---------- | --------------------- | -------------- |
| Backend    | `.env.example`        | `.env`         |
| Dashboard  | `.env.local.example`  | `.env.local`   |
| Mobile     | `.env.example`        | `.env`         |

Never commit `.env`, `.env.local`, or other files containing secrets.

## Git

This repo ignores `node_modules/`, build output, local env files, and uploaded media under `backend/uploads/`. Lock files (`package-lock.json`) are committed for reproducible installs.

## License

Private — all rights reserved unless otherwise specified.
