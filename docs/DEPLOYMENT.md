# Deployment Guide — Church QR Attendance System

This covers the full path to production: **Neon** (database) → **Railway** (API) → **EAS** (mobile builds).

---

## 1. Neon (PostgreSQL)

1. Create a project at <https://neon.tech>.
2. In the dashboard, copy the **pooled** connection string. It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```
3. You'll use this as `DATABASE_URL` for both local dev and Railway.

> The API uses Neon's serverless HTTP driver (`@neondatabase/serverless`), so the
> pooled URL works without a long-lived TCP connection — ideal for Railway.

### Apply schema + seed (run locally once)

```bash
cd apps/api
cp .env.example .env          # paste DATABASE_URL + a strong JWT_SECRET
cd ../..
bun install
bun run db:migrate            # creates all 12 tables + enums
bun run db:seed               # 4 Friday categories + 1 super admin
```

Seeded super admin: phone `01000000000`, password `ChangeMe@123`. **Change it after first login.**

---

## 2. Railway (API)

The API lives in `apps/api` and is configured via [apps/api/railway.json](../apps/api/railway.json) + [apps/api/nixpacks.toml](../apps/api/nixpacks.toml).

1. Create a new Railway project from this repo.
2. Set the service **root directory** to the repo root (the nixpacks file runs the
   workspace install and points at `apps/api`).
3. Add environment variables in Railway:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon pooled URL |
   | `JWT_SECRET` | a 32+ char random string |
   | `JWT_EXPIRES_IN` | `30d` |
   | `ALLOWED_ORIGINS` | `*` (or your app's origins) |
   | `NODE_ENV` | `production` |
   | `PORT` | Railway sets this automatically; the app reads it |
4. Deploy. The build phase runs `db:migrate`; the start phase runs the server.
5. Health check: `GET https://<your-service>.up.railway.app/health` → `{"status":"healthy"}`.

> **Migrations on deploy** are handled by `nixpacks.toml`'s build phase. If you
> prefer to gate migrations manually, remove that line and run `bun run db:migrate`
> from a one-off Railway shell.

---

## 3. EAS (mobile builds)

The mobile app is in `apps/mobile`, configured via [apps/mobile/eas.json](../apps/mobile/eas.json).

1. `npm i -g eas-cli && eas login`
2. From `apps/mobile`, run `eas init` to link a project.
3. Edit `eas.json` → set `EXPO_PUBLIC_API_URL` in the `preview`/`production`
   profiles to your Railway URL.
4. Build:
   ```bash
   cd apps/mobile
   eas build --profile preview --platform android   # internal APK
   eas build --profile production --platform all     # store builds
   ```
5. Submit: `eas submit --profile production --platform ios|android`.

### Pointing the mobile app at the API

| Context | How |
|---|---|
| Local dev, emulator | `EXPO_PUBLIC_API_URL=http://localhost:8080` in `apps/mobile/.env` |
| Local dev, physical device | use your machine's LAN IP, e.g. `http://192.168.1.20:8080` |
| Production | Railway URL, set via `eas.json` env per profile |

---

## 4. Environment variables summary

### apps/api/.env
```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
JWT_SECRET=<32+ chars>
JWT_EXPIRES_IN=30d
PORT=8080
NODE_ENV=development
ALLOWED_ORIGINS=*
SEED_SUPERADMIN_PHONE=01000000000
SEED_SUPERADMIN_PASSWORD=ChangeMe@123
```

### apps/mobile/.env
```
EXPO_PUBLIC_API_URL=http://localhost:8080
```

---

## 5. Testing the full flow

1. **Backend up:** `bun run api:dev` → hit `/health`.
2. **Seed verified:** `bun run db:seed` prints the super-admin credentials.
3. **Mobile up:** `bun run mobile:start`, open in Expo Go / dev client.
4. **Smoke test end-to-end:**
   - Register a new member → lands on the "Awaiting Approval" screen.
   - Log in as super admin → Member Center shows the pending member → Approve.
   - Member logs in → Home loads (verse, meeting, stats), My QR shows a code.
   - As an admin with `can_scan`, open Scanner, pick a category, scan the member's QR
     → success animation, today's count increments.
   - Repeat across all 4 categories → "Set Completed" fires; Comms → Sets shows the
     pending reward → tap "Gift Delivered" → member's completed-sets count increases
     and progress resets.
   - Send an announcement/alert from Comms → appears in the member's Alerts tab.

### Bundle verification (no devices needed)

```bash
cd apps/mobile
bunx expo export --platform ios --output-dir /tmp/ios
bunx expo export --platform android --output-dir /tmp/android
```

Both should finish with `Exported: ...` and exit code 0.

---

## 6. Troubleshooting

- **Babel "Cannot find module" during bundling** — ensure the root `bunfig.toml`
  has `linker = "hoisted"`, then reinstall (`rm -rf node_modules && bun install`).
  Babel's plugin resolver needs a hoisted layout.
- **`useQuery` types show `any`** — the mobile package must use TypeScript ≥ 5.4
  (`NoInfer` support). It's pinned to 5.7.
- **CORS errors on device** — set `ALLOWED_ORIGINS=*` on the API or add your origin.
- **401 immediately after login** — check the device clock and that `JWT_SECRET`
  matches between the instance that signed and the one validating.
