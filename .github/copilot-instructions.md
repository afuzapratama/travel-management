# Copilot Instructions — Invoice System (Travel Panel)

## Project Overview

Travel booking & invoice management for **PT Global Teknik Multi Guna** (Medan, Indonesia). React 19 + TypeScript + Vite, backed by Supabase (Postgres + Realtime). Two roles: **Agent** (creates bookings) and **Admin** (manages everything). All UI text is **Bahasa Indonesia**.

## Architecture & Data Flow

```
main.tsx: StrictMode → AppProvider → ConfirmProvider → App
App.tsx:  !user → LoginPage | initialLoading → LoadingScreen | agent → AgentPanel | admin → AdminPanel
```

- **No router** — `App.tsx` switches views via `user.role` from `AppContext`. Navigation is state-driven via Context + `sessionStorage`
- **Single Context** (`src/context/AppContext.tsx`) holds user, bookings[], deletedBookings[], companySettings, and all mutation functions — no Redux/Zustand
- **Data layer** — ALL Supabase calls go through `src/lib/supabaseService.ts`. This is the **only** file that touches the DB. It translates `snake_case` DB columns ↔ `camelCase` app types via `rowToBooking()` / insert/update payloads
- **Realtime sync** — Supabase Realtime subscriptions in `AppContext` keep bookings in sync. On UPDATE, checks `deleted_at`: if set → removes from active list; if cleared (restore) → re-fetches and adds back. Uses mutation-tracking refs (`mutatingIdsRef`) to prevent Realtime race conditions with local state
- **Auth** — Access-key based (not Supabase Auth). Keys validated against `access_keys` table. RLS is enabled but permissive (`FOR ALL USING (true)`)
- **Confirm dialogs** — `ConfirmProvider` + `useConfirm()` hook (promise-based) replaces native `window.confirm()`. Supports `variant: 'danger' | 'warning' | 'info'` with matching colors/icons. `window.alert()` is still used for error toasts

## Commands

- `npm run dev` — Vite dev server
- `npm run dev:email` — Email API server (Express, port 3001)
- `npm run dev:all` — Run both Vite + email server concurrently
- `npm run mailpit` — Start Mailpit via Docker (SMTP :1025, UI :8025)
- `npm run build` — TypeScript check (`tsc -b`) + Vite production build
- `npm run lint` — ESLint
- `node scripts/seed-bookings.mjs` — Seed 80 dummy bookings
- `node scripts/migrate-soft-delete.mjs` — Add `deleted_at` column + index to bookings

## Key Conventions

### DB ↔ TypeScript Naming
DB uses `snake_case`, TypeScript uses `camelCase`. The mapping is **manual** in `supabaseService.ts` (`rowToBooking`, `rowToAgent`, and insert/update payloads). When adding a new DB column, you must update **three places**: the insert payload, the update payload, and `rowToBooking`.

### Component File Pattern
Each view has `.tsx` + `.css` pair (e.g., `AdminPanel.tsx` + `AdminPanel.css`). Exception: `AgentInvoiceView.tsx` reuses `InvoicePreview.css` + `AdminInvoiceView.css` — it has no dedicated CSS file.

### Admin Inline-Edit Components (local to `AdminInvoiceView.tsx`, not exported)
- **`E`** — click-to-edit text field (blur/Enter saves, Escape reverts)
- **`EC`** — click-to-edit currency (displays via `formatRupiah`, parses via `parseRupiahInput`)
- **`ES`** — click-to-edit select dropdown (outside-click-to-close)
- **`CF`** — click-to-copy read-only field (for agent-submitted data admin shouldn't edit)

Admin auto-saves with **800ms** debounce via `setTimeout` ref. Agent form draft saves to `sessionStorage` with **300ms** debounce.

### Session Persistence (`sessionStorage`, `gtmg_*` prefix)
| Key | Stores | Used in |
|-----|--------|---------|
| `gtmg_user` | `{ role, keyId, agent? }` | `AppContext.tsx` |
| `gtmg_admin_nav` | `{ tab: Tab, viewId }` | `AdminPanel.tsx` |
| `gtmg_agent_nav` | `'new' \| 'list'` | `AgentPanel.tsx` |
| `gtmg_agent_form` | Full `Booking` JSON draft | `AgentPanel.tsx` |
| `gtmg_agent_view` | Viewed booking ID | `AgentPanel.tsx` |

### Admin Panel Tabs
Type `Tab = 'request' | 'active' | 'all' | 'settings' | 'trash'`. Default tab is `'request'`. The **trash** tab shows soft-deleted bookings with restore/permanent-delete actions. Settings tab has 3 sub-tabs: keys (access key CRUD), agents (agent CRUD), company (logo/signature upload).

### Soft-Delete / Trash System
- Bookings have a `deleted_at` timestamp column (null = active)
- `deleteBookingFromDb(id)` sets `deleted_at` (soft-delete); `restoreBookingInDb(id)` clears it; `permanentDeleteBookingFromDb(id)` does SQL DELETE
- `fetchBookings()` auto-filters `deleted_at IS NULL`; `fetchDeletedBookings()` fetches only trashed
- Soft-delete is transparent to agents — they never see trash

### Indonesian Locale Utilities (`src/utils/`)
- `terbilang(n)` → `"Satu Juta Lima Ratus Ribu Rupiah"`
- `formatRupiah(n)` → `"1.500.000"` / `formatRupiahFull(n)` → `"Rp 1.500.000"` / `parseRupiahInput(s)` → number
- `formatDateIndo(s)` → `"27 Februari 2026"` / `formatDateShort(s)` → `"27 Feb 2026"` / `formatDateSlash(s)` → `"27/02/2026"`
- `generateInvoiceNumber()` → `INV/YYYYMMDD/XXX` (async — queries DB for monthly sequence)
- `generatePONumber()` → `PO/GTMG/YYMM/XXX` (async — same pattern)
- `getTodayDate()` → `YYYY-MM-DD` string
- `DateInput` component (`src/components/DateInput.tsx`) — custom DD/MM/YYYY input with auto-formatting, calendar fallback, and date validation (leap year aware). Used instead of native date inputs

### Passenger Handling
- Passengers live in separate `passengers` table with `booking_id` FK (cascade delete)
- Updates use **delete-all-then-reinsert** strategy (not upsert)
- `sort_order` column preserves ordering; client-side IDs via `crypto.randomUUID()`
- Empty passengers (no name) are silently filtered out before insert

### Invoice Visibility Flags
`hideKeterangan` and `hideHarga` booleans on `Booking` control whether notes and pricing sections appear on the invoice PDF. Mapped to `hide_keterangan` / `hide_harga` DB columns.

### PDF Export (`src/utils/exportPdf.ts`)
Uses `html2canvas` + `jsPDF`. Temporarily overrides invoice element to fixed width (A4), captures as PNG, generates single-page PDF with dynamic height. Styles restored in `finally` block. Mobile invoice view uses `react-zoom-pan-pinch` for pinch-zoom.
- `exportToPDF(element, filename)` — triggers browser download
- `generatePDFBlob(element, filename)` — returns `{ blob, fileName }` for email attachment / sharing

### Share Invoice (`src/utils/shareInvoice.ts` + `src/components/ShareInvoiceModal.tsx`)
Two channels: **Email** (with PDF attachment) and **WhatsApp** (text + PDF auto-send). **Only Admin** can share invoices — Agent view has no share button.
- **Email flow**: `ShareInvoiceModal` → `generatePDFBlob()` → `sendInvoiceEmail()` → Express server (`server/index.js`) → Mailpit SMTP (dev) or Resend API (prod)
- **WhatsApp flow (auto)**: If `VITE_WHATSAPP_API_URL` is set → `sendWhatsAppAuto()` POSTs to n8n webhook on VPS → n8n sends text + PDF via Evolution API → WhatsApp delivered automatically
- **WhatsApp flow (fallback)**: If `VITE_WHATSAPP_API_URL` is empty → `openWhatsApp()` opens `wa.me/{phone}?text=...` deep link (manual send)
- `isWhatsAppAutoSendAvailable()` checks if VPS is configured — UI adapts button label ("Kirim WhatsApp" vs "Buka WhatsApp")
- **Mobile fallback**: tries Web Share API first (can attach PDF file), falls back to wa.me link
- **WhatsApp message** (`src/utils/whatsappMessage.ts`): adapts to payment status — if `lunas` → compact (no price/bank info); if `belum-lunas`/`dp` → includes rincian harga + pembayaran
- Email HTML template in `src/utils/invoiceEmail.ts`, WA message formatter in `src/utils/whatsappMessage.ts`
- Email server config: `server/.env.example` — switch `EMAIL_PROVIDER=mailpit|resend`

### WhatsApp VPS Infrastructure (`vps-setup/`)
Separate VPS running Docker with Evolution API (WhatsApp gateway) + n8n (workflow automation) + Nginx (reverse proxy + SSL) + Cloudflare WARP (proxy for WhatsApp connectivity). Full documentation in `vps-setup/README.md`.

**Architecture**: Invoice App → POST n8n webhook → n8n sends text + PDF via Evolution API → WhatsApp

**Key components**:
- `docker-compose.yml` — 5 services: postgres, redis, evolution-api (custom build with proxychains), n8n, nginx + certbot
- `evolution-proxy/` — Custom Docker image: Evolution API v2.2.3 + proxychains-ng (routes ALL traffic including WebSocket keep-alive via WARP SOCKS5)
- `nginx/` — HTTP-only initial config + SSL configs in `sites-ssl/` (auto-switched by setup.sh after certbot)
- `n8n-workflow.json` — Importable workflow: Webhook → Send Text → Has PDF? → Send PDF → Response
- `setup.sh` — Full auto-setup: generate .env, DNS check, firewall, Docker start, SSL, cron
- `connect-whatsapp.sh` — Create instance + generate QR code for scanning
- `test-send.sh` — End-to-end test via n8n webhook
- `setup-ssl.sh` — Retry SSL if it failed during initial setup
- `cleanup.sh` — Full teardown (removes all data + volumes)

**Critical notes**:
- Evolution API uses `network_mode: host` (required for proxychains to reach WARP on 127.0.0.1:40000)
- n8n and nginx use `extra_hosts: host.docker.internal:host-gateway` to reach Evolution API on host
- `WEB_VERSION` env var is **mandatory** when VPS can't directly fetch `web.whatsapp.com/sw.js` — must match latest WhatsApp Web client revision
- n8n workflow uses **hardcoded URLs** (not $env) because n8n blocks `$env` access in expressions
- PDF sent as **raw base64** (no `data:` prefix) — Evolution API rejects the prefix
- Deploy to VPS: `rsync -avz --delete --exclude='.env' --exclude='nginx/conf.d/default.conf' -e "ssh -p <PORT>" vps-setup/ root@<VPS_IP>:~/whatsapp-automation/`

## Database Schema

5 tables in `supabase-schema.sql`: `access_keys`, `agents`, `bookings`, `passengers`, `company_settings`. Realtime enabled for `bookings` + `passengers`. Auto-updated `updated_at` triggers on all tables. Default keys: `admin123` / `agent123`. **Note:** the schema file is append-only — base CREATE TABLEs + later ALTERs (renames, new columns, soft-delete) must be read together.

Images (logo, signature) stored as **base64 data URLs** in `company_settings` (not file storage). `src/lib/database.types.ts` exists but is stale/unused — the service layer uses its own type casts.

## Known Code Duplication

`AgentPanel.tsx` and `AgentInvoiceView.tsx` (edit mode) duplicate: airport autocomplete, 24-hour time picker, import-passengers feature, passenger management dropdowns, and quick-route buttons. When modifying any of these features, update **both** files.

## Environment Variables

Required in `.env` (Vite `VITE_` prefix):
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<supabase-anon-key>
VITE_EMAIL_API_URL=http://localhost:3001
VITE_WHATSAPP_API_URL=https://n8n.gtmgroup.co.id  # kosongkan jika belum setup
```

Email server config in `server/.env` (see `server/.env.example`):
```
EMAIL_PROVIDER=mailpit
MAILPIT_HOST=localhost
MAILPIT_PORT=1025
# RESEND_API_KEY=re_xxx (production)
```

## Important Gotchas

- No test framework — there are no tests
- Icons are Font Awesome 6 via CDN (`index.html`), not a React icon library — use `<i className="fa-solid fa-xxx">`
- `src/utils/storage.ts` is **legacy** (localStorage-based) — the app uses Supabase as primary data layer
- `ConfirmProvider` must wrap the app (in `main.tsx`). Using `useConfirm()` outside the provider throws
- Text inputs enforce `.toUpperCase()` on names, flight numbers, passport numbers
- AgentPanel has its own inline validation/confirmation modals (not using the shared `ConfirmDialog`)
- `beforeunload` handler warns before accidental page reload when agent has unsaved form data
