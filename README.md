# Ecojindu Shuttle — Operations Dashboard & Driver Portal

One Next.js app, role-gated after login:

* **Operations / super admin** — a dense, calm control room. Dark forest sidebar,
  light content area, brand greens as accents only.
* **Drivers** — a separate phone-first shell with a bottom bar and big targets,
  because drivers use it standing at a terminal gate.

```
ecojindu-backend                    FastAPI · owns Postgres · :8000
ecojindu-api                        FastAPI · WhatsApp + agent gateway · :8001
ecojindu-web                        Next.js · customer site · :3000
ecojindu-admin     ← you are here   Next.js · operations + driver portal · :3001
```

---

## Setup

**Requires** Node 18.17+ and `ecojindu-backend` running on :8000.

```bash
cd ~/Desktop/ecojindu-admin

npm install
cp .env.example .env.local

npm run dev          # http://localhost:3001
```

Sign in at **http://localhost:3001/login**:

| Role | Email | Password | Lands on |
|---|---|---|---|
| Super admin | `admin@ecojindu.ng` | `Ecojindu@2026` | `/` |
| Operations | `ops@ecojindu.ng` | `Ecojindu@2026` | `/` |
| Driver | `emeka.driver@ecojindu.ng` | `Driver@2026` | `/driver` |
| Driver | `uche.driver@ecojindu.ng` | `Driver@2026` | `/driver` |

A passenger account is rejected at sign-in with a clear message. A driver who
lands on an operations URL is redirected to their own portal rather than shown a
permission error — they aren't doing anything wrong.

---

## Operations views

| Route | What it does |
|---|---|
| `/` | **Overview** — today's departures with live occupancy bars, revenue today/week/month, channel mix, upcoming-departure ticker, and alerts for unassigned drivers/vehicles and low occupancy inside 24 hours |
| `/analytics` | Revenue trend (bar + line), occupancy by time slot, channel mix donut, route performance and subscription sales. Date-range filter and **CSV export** |
| `/trips` | Departures table with occupancy and revenue, plus the **timetable** editor. Assign vehicle/driver, cancel a departure with a "notify all passengers" confirmation that fires the email + SMS broadcast |
| `/bookings` | Searchable, filterable table (reference, phone, name, status, channel) with a detail drawer: QR ticket, resend, force-confirm, cancel. Manual booking creation for walk-ins |
| `/manifest` | Per-trip passenger manifest with seat numbers, pickup points and boarding status. Auto-refreshes every 30 s, printable |
| `/scanner` | Web QR scanner (`html5-qrcode`, rear camera) that calls the validate endpoint and shows a full-bleed green ✓ or red ✗ |
| `/subscriptions` | Plans on sale, subscriber list, credits remaining, expiry warnings |
| `/fleet` | Vehicles CRUD with status (active/charging/maintenance/retired), routes with their stop chains, fare and journey-time editing |
| `/people` | Drivers CRUD **including their portal logins**, vehicle assignment, and staff accounts (super admin only) |
| `/settings` | Editable notification templates with SMS segment counts, and the live delivery log |

## Driver portal

| Route | What it does |
|---|---|
| `/driver` | Today at a glance — trip count, passenger count, next departure, assigned vehicle, today's runs and what's coming up |
| `/driver/trips/[tripId]` | Pickup point, occupancy, passenger manifest with seat numbers and one-tap call, and the status control: **Boarding → Departed → Arrived** |
| `/driver/scanner` | The same scanner component, lockable to one departure so a wrong-trip ticket is refused |

Status transitions are forward-only, matching the backend's guard — a driver can
advance a trip but never rewind it, and only operations can cancel one.

---

## The check-in scanner

`src/components/qr-scanner.tsx` is shared by both portals.

* `html5-qrcode` is imported **dynamically** — it touches `window` at module scope
  and would otherwise break the server build.
* The same code scanned twice inside 3 seconds is ignored, so a ticket held in
  frame doesn't fire repeatedly.
* Results are loud on purpose: a full-bleed green ✓ or red ✗ readable at arm's
  length in daylight, plus a haptic buzz where the device supports it.
* **Manual entry is always available.** A cracked screen or a dead battery
  shouldn't strand a passenger — typing the booking reference goes down the same
  validation path.
* Tickets are HMAC-signed by the backend, so a forged or edited QR is refused. A
  second scan of a valid ticket reports `already_checked_in` rather than passing
  silently.

Camera access needs **HTTPS** (or `localhost`). On a deployed URL that's automatic.

---

## Environment

This app holds no secrets — staff authenticate with a JWT against the backend.

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Where `ecojindu-backend` lives. Must be in its `CORS_ORIGINS` |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL |
| `NEXT_PUBLIC_SUPPORT_EMAIL` / `_PHONE` | Shown on error and lock-out screens |
| `NEXT_PUBLIC_LOW_OCCUPANCY_THRESHOLD` | Occupancy % below which a departure inside 24 h raises an alert |

`NEXT_PUBLIC_*` values are inlined at build time — rebuild to change them.

---

## Design notes

Same brand palette as the customer site, retuned for density:

| Token | Hex | Used for |
|---|---|---|
| `forest-deep` | `#16281A` | Sidebar and driver header |
| `moss` | `#4C8C2B` | Active nav, primary actions, healthy occupancy |
| `leaf` / `teal` | `#7CB342` / `#2BAE8E` | Positive states, accents |
| `surface` / `line` | `#FFFFFF` / `#E6E8E4` | Panels and table rules — deliberately quiet |
| `amber` | `#D99A20` | Warnings, low occupancy, pending payment |
| `clay` | `#C4562F` | Errors and refusals only |

* **Occupancy is colour-coded by health** (≥80% moss, ≥50% leaf, ≥25% amber, below
  that clay), because it's the number operations reads most often.
* **Wide tables scroll inside their own container** (`.scroll-x`) — the page body
  never scrolls sideways.
* All numeric columns use `tabular-nums` so figures line up down a column.
* Every table row is keyboard-reachable; drawers and dialogs trap focus and
  restore it on close.
* Charts (Recharts) use a brand-first categorical palette defined once in
  `src/components/brand.tsx`.

---

## Project layout

```
src/
  app/
    login/                staff sign-in, role-aware redirect
    (ops)/                operations group — role-gated by its layout
      page.tsx            overview
      analytics/ trips/ bookings/ manifest/ scanner/
      subscriptions/ fleet/ people/ settings/
    driver/               driver portal — its own shell and role gate
      page.tsx  trips/[tripId]/  scanner/
  components/
    app-shell.tsx         sidebar, mobile drawer, PageHeader
    qr-scanner.tsx        shared camera + manual check-in
    ui/                   panel, badge, occupancy bar, stat, dialog, drawer, …
  lib/
    api.ts                typed client for every admin and driver endpoint
    auth.tsx              AuthProvider, ADMIN_ROLES, useRequireRole
    admin-types.ts        admin/driver response shapes
    types.ts, utils.ts    shared with the customer site
```

---

## Deploying to Cloud Run

```bash
PROJECT=your-gcp-project
REGION=africa-south1

docker build -t gcr.io/$PROJECT/ecojindu-admin \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://ecojindu-backend-xxxx.run.app \
  --build-arg NEXT_PUBLIC_SITE_URL=https://ops.ecojindu.ng .

docker push gcr.io/$PROJECT/ecojindu-admin

gcloud run deploy ecojindu-admin \
  --image gcr.io/$PROJECT/ecojindu-admin \
  --region $REGION --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 5 --cpu 1 --memory 512Mi
```

Checklist:

1. Add the deployed origin to the backend's `CORS_ORIGINS`.
2. The scanner needs HTTPS for camera access — Cloud Run gives you that.
3. This is an internal tool: `robots` is set to `noindex, nofollow`. Consider
   putting it behind Cloud IAP or an IP allow-list as well.
4. `--min-instances 0` is fine here; staff tolerate a cold start, passengers don't.

---

Ecojindu Shuttle · Nnenna Otti Bus Terminal, Umuahia, Abia State
`jinduinc@gmail.com` · +234 815 447 1570 · @ecojindu.ng
*Bridging Cities, Powering Green Mobility.*
