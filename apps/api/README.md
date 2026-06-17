# Church QR Attendance — API

Hono + Drizzle ORM + Neon Postgres. JWT auth, role/permission middleware, rate limiting.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | – | Self-register a member (status=pending) |
| POST | `/api/auth/login` | – | Returns `{ token, user, permissions }` |
| GET | `/api/auth/me` | token | Current user + permissions |
| GET | `/api/member/home` | token | Aggregated member dashboard |
| GET | `/api/member/qr` | token | Member's QR token (creates if missing) |
| POST | `/api/member/qr/refresh` | token | Regenerate QR token |
| GET | `/api/attendance/progress` | token | Member set progress |
| POST | `/api/attendance/scan` | `can_scan` | Record a check-in from a QR scan |
| GET | `/api/attendance` | `can_view_logs` | `?range=today\|week&q=` |
| GET | `/api/attendance/today/count` | `can_scan` | Today's check-ins |
| GET | `/api/attendance/sets/pending` | `can_scan` | Sets awaiting reward |
| POST | `/api/attendance/sets/claim` | `can_scan` | Deliver reward + reset progress |
| GET | `/api/attendance/me/count` | token | Member total attendance |
| GET | `/api/categories` | token | Friday categories |
| GET | `/api/notifications` | token | User notifications |
| GET | `/api/notifications/unread-count` | token | Badge count |
| POST | `/api/notifications/read` / `/read-all` | token | Mark read |
| GET/POST/DELETE | `/api/announcements` | view/`can_send_messages` | Announcements |
| GET/POST | `/api/alerts` | view/`can_send_messages` | Alerts |
| POST | `/api/alerts/:id/read` | token | Read receipt |
| GET | `/api/alerts/:id/receipts` | `can_send_messages` | Read receipts |
| GET/POST | `/api/comms/birthdays` `/absences` | `can_send_messages` | Birthdays & absences |
| GET | `/api/users` | admin | `?role=&status=&q=` |
| POST | `/api/users` | admin | Create member/admin |
| GET/PATCH | `/api/users/:id` | admin | Read / update user |
| PATCH | `/api/users/:id/status` | admin | Approve/reject/restore |
| PATCH | `/api/users/me` | token | Update own profile (incl. `profileImage` data URL) |
| POST | `/api/users/me/push-token` | token | Save Expo push token |
| POST | `/api/admins` | super_admin | Create admin w/ permissions |
| GET/PUT | `/api/admins/:id/permissions` | super_admin | Manage permissions |
| GET | `/api/reports/dashboard` | super_admin | KPI dashboard |
| GET | `/api/reports/attendance.csv` | `can_generate_reports` | CSV export |

## Local dev

```bash
cp .env.example .env   # set DATABASE_URL + JWT_SECRET
bun install
bun run db:generate    # already generated; re-run after schema edits
bun run db:migrate
bun run db:seed
bun run dev            # http://localhost:8080
```

## Profile images

To avoid external storage infra, profile images are sent by the client as a
`data:image/...;base64,...` URL and stored in `users.profile_image`. Swap to S3/R2
by replacing the client encode step and storing a public URL instead — the API
already treats `profileImage` as an opaque string.
