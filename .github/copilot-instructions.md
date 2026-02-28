# Copilot Instructions — Invoice System (Travel Panel)

## Project Overview

Travel booking & invoice management for **PT Global Teknik Multi Guna** (Medan, Indonesia). React 19 + TypeScript + Vite, backed by Supabase (Postgres + Realtime). Two roles: **Agent** (creates bookings) and **Admin** (manages everything). All UI text is **Bahasa Indonesia**.

## Architecture & Data Flow

```
LoginPage → validateKey() → AppContext sets user (sessionStorage: gtmg_user)
  → Agent: AgentPanel (booking form + list) → AgentInvoiceView (read-only + edit mode)
  → Admin: AdminPanel (dashboard tabs) → AdminInvoiceView (inline-editable invoice)
```

- **No router** — `App.tsx` switches views via `user.role` from `AppContext`
- **Single Context** (`src/context/AppContext.tsx`) holds user session, bookings[], and company settings — no Redux/Zustand
- **Data layer** — ALL Supabase calls go through `src/lib/supabaseService.ts`. This is the **only** file that touches the DB. It translates `snake_case` DB columns ↔ `camelCase` app types via `rowToBooking()` / `createBooking()`
- **Realtime sync** — Supabase Realtime subscriptions in `AppContext` keep bookings in sync across all clients. On INSERT/UPDATE events, the full booking is re-fetched via `fetchBookingById()` to include passengers
- **Auth** — Access-key based (not Supabase Auth). Keys validated against `access_keys` table. RLS is enabled but permissive (`FOR ALL USING (true)`)

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — ESLint
- `node scripts/seed-bookings.mjs` — Seed 80 dummy bookings

## Key Conventions

### DB ↔ TypeScript Naming
DB uses `snake_case`, TypeScript uses `camelCase`. The mapping is **manual** in `supabaseService.ts` (`rowToBooking`, `rowToAgent`, and insert/update payloads). When adding a new DB column, you must update all three places: the insert payload, the update payload, and `rowToBooking`.

### Component File Pattern
Each view has `.tsx` + `.css` pair (e.g., `AdminPanel.tsx` + `AdminPanel.css`). Exception: `AgentInvoiceView.tsx` reuses `InvoicePreview.css` + `AdminInvoiceView.css` — it has no dedicated CSS file.

### Admin Inline-Edit Components (in `AdminInvoiceView.tsx`, not exported)
- **`E`** — click-to-edit text field (blur/Enter saves, Escape reverts)
- **`EC`** — click-to-edit currency (displays via `formatRupiah`, parses via `parseRupiahInput`)
- **`ES`** — click-to-edit select dropdown (outside-click-to-close)
- **`CF`** — click-to-copy read-only field (for agent-submitted data admin shouldn't edit)
- **`CSS`** (StatusSelector) — status dropdown with FA icons and colors

Admin auto-saves with **800ms** debounce via `setTimeout` ref. Agent form draft saves to `sessionStorage` with **300ms** debounce.

### Session Persistence (`sessionStorage`, `gtmg_*` prefix)
| Key | Stores | Used in |
|-----|--------|---------|
| `gtmg_user` | `{ role, keyId, agent? }` | `AppContext.tsx` |
| `gtmg_admin_nav` | `{ tab, bookingId }` | `AdminPanel.tsx` |
| `gtmg_agent_nav` | `'new' \| 'list'` | `AgentPanel.tsx` |
| `gtmg_agent_form` | Full `Booking` JSON draft | `AgentPanel.tsx` |
| `gtmg_agent_view` | Viewed booking ID | `AgentPanel.tsx` |

### Indonesian Locale Utilities (`src/utils/`)
- `terbilang(n)` → Indonesian words + "Rupiah" (e.g., `"Satu Juta Lima Ratus Ribu Rupiah"`)
- `formatRupiah(n)` / `formatRupiahFull(n)` → dot-separated (e.g., `"1.500.000"` / `"Rp 1.500.000"`)
- `formatDateIndo(s)` → `"27 Februari 2026"` format
- `generateInvoiceNumber()` → `INV/YYYYMMDD/XXX` (async — queries DB for monthly sequence)
- `generatePONumber()` → `PO/GTMG/YYMM/XXX` (async — same pattern)

### Passenger Handling
- Passengers live in separate `passengers` table with `booking_id` FK (cascade delete)
- Updates use **delete-all-then-reinsert** strategy (not upsert)
- `sort_order` column preserves ordering
- Client-side IDs via `crypto.randomUUID()`

### PDF Export (`src/utils/exportPdf.ts`)
Uses `html2canvas` (scale:2, JPEG 0.95) + `jsPDF`. Temporarily overrides invoice element to 794px width (A4), captures, generates single-page PDF with dynamic height. Styles restored in `finally` block.

## Database Schema

5 tables in `supabase-schema.sql`: `access_keys`, `agents`, `bookings`, `passengers`, `company_settings`. Realtime enabled for `bookings` + `passengers`. Auto-updated `updated_at` triggers on all tables. Default keys: `admin123` / `agent123`.

Images (logo, signature) stored as **base64 data URLs** in the DB (not file storage).

## Known Code Duplication

`AgentPanel.tsx` and `AgentInvoiceView.tsx` (edit mode) duplicate: airport autocomplete, 12-hour time picker, import-passengers feature, passenger management dropdowns, and quick-route buttons. When modifying any of these features, update **both** files.

## Environment Variables

Required in `.env` (Vite `VITE_` prefix):
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<supabase-anon-key>
```

## Important Gotchas

- No test framework — there are no tests
- No routing library — navigation is state-driven via Context + sessionStorage
- Icons are Font Awesome 6 via CDN (`index.html`), not a React icon library — use `<i className="fa-solid fa-xxx">`
- `src/utils/storage.ts` is **legacy** (localStorage-based) — the app now uses Supabase as primary data layer
- Confirmation dialogs use native `window.confirm()` — no modal library
- Text inputs enforce `.toUpperCase()` on names, flight numbers, passport numbers
