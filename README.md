# Church QR Attendance System

**Virgin Mary & St. Bishoy Church** — production-ready QR-based attendance with role-based apps for Members, Admins, and Super Admins. Bilingual (Arabic / English), dark-mode aware.

Monorepo:

```
church-qr-attendance/
├── apps/
│   ├── api/        # Hono + Drizzle + Neon Postgres REST API (deploy: Railway)
│   └── mobile/     # Expo (React Native) app — iOS & Android
└── packages/
    └── shared/     # Types + Zod schemas shared by api and mobile
```

See [apps/api/README.md](apps/api/README.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full setup, Neon, Railway, and EAS instructions.

## Quick start

```bash
bun install

# 1. Backend (apps/api)
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL + JWT_SECRET
bun run db:generate
bun run db:migrate
bun run db:seed
bun run api:dev                          # http://localhost:8080

# 2. Mobile (apps/mobile)
cp apps/mobile/.env.example apps/mobile/.env   # set EXPO_PUBLIC_API_URL
bun run mobile:start
```

Default seeded Super Admin: phone `01000000000`, password `ChangeMe@123` — change it immediately.
