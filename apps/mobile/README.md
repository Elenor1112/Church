# Church QR Attendance — Mobile (Expo)

React Native app (Expo SDK 52, Expo Router) for iOS & Android. NativeWind styling,
Reanimated animations, Zustand + TanStack Query, bilingual (AR/EN) with dark mode.

## Structure

```
apps/mobile/
├── app/                       # Expo Router routes
│   ├── _layout.tsx            # Providers (theme, i18n, query) + auth hydration
│   ├── index.tsx              # Role-based redirect gate
│   ├── (auth)/                # sign-in, register, pending
│   ├── (member)/              # home, qr, alerts, profile
│   ├── (admin)/               # scanner, attendance, comms, members, profile
│   └── (super)/               # dashboard, members, profile
└── src/
    ├── components/ui/          # Design-system primitives (Card, Button, …)
    ├── components/FloatingTabBar.tsx
    ├── features/               # hooks (React Query), ProfileScreen, MemberDirectory, permissions, guards
    ├── store/                  # Zustand: authStore + uiStores
    ├── lib/                    # api client, storage (SecureStore), config, notifications, time
    ├── theme/                  # tokens + ThemeProvider (dark mode)
    └── i18n/                   # strings + I18nProvider (RTL aware)
```

## Run

```bash
# from repo root
cp apps/mobile/.env.example apps/mobile/.env   # set EXPO_PUBLIC_API_URL
bun run mobile:start
```

- Press `i` / `a` for iOS / Android, or scan the QR with Expo Go.
- For a physical device, set `EXPO_PUBLIC_API_URL` to your machine's LAN IP.

## State management

- **authStore** (Zustand) — token (persisted to Expo Secure Store), current user,
  admin permissions; hydrates on launch via `/auth/me`.
- **uiStores** (Zustand) — scanner category selection, member directory filters.
- **TanStack Query** — all server data (home, attendance, members, dashboard, …).

## Type checking & bundling

```bash
bun run mobile:typecheck                 # tsc --noEmit, 0 errors
bunx expo export --platform ios          # full Metro bundle
bunx expo export --platform android
```

See [../../docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md) for EAS builds.
