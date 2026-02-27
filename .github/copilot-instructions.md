# Copilot Instructions — Invoice System (Travel Panel)

## Project Overview

Travel booking & invoice management system for **PT Global Teknik Multi Guna** (Medan, Indonesia). Built with React 19 + TypeScript + Vite, backed by Supabase (Postgres + Realtime). Two roles: **Agent** (creates bookings) and **Admin** (manages bookings, keys, agents, company settings). All UI text is in **Bahasa Indonesia**.

## Architecture

- **Single-page app** with no router — `App.tsx` switches views based on `user.role` from `AppContext`
- **State management**: Single React Context (`src/context/AppContext.tsx`) holds user session, bookings list, and company settings. No Redux/Zustand
- **Auth**: Access-key based (not Supabase Auth). Keys are validated against `access_keys` table. Session stored in `sessionStorage` under `gtmg_user`
- **Realtime sync**: Supabase Realtime subscriptions in `AppContext` keep bookings in sync across all connected clients (agent ↔ admin)
- **Data layer**: All Supabase calls go through `src/lib/supabaseService.ts` — this is the only file that touches the DB. It translates between `snake_case` DB columns and `camelCase` app types
- **PDF export**: `html2canvas` + `jsPDF` renders the invoice DOM element to a pixel-perfect A4 PDF (`src/utils/exportPdf.ts`)

## Key Data Flow

```
LoginPage → validateKey() → AppContext sets user
  → Agent: AgentPanel (create booking form + list)
  → Admin: AdminPanel (dashboard tabs) → AdminInvoiceView (inline-editable invoice)
```

Bookings are the core entity. Each booking contains: flight info, passengers[], billTo, invoice metadata, payment info, and company info (can be overridden per invoice). Passengers are stored in a separate `passengers` table with `booking_id` FK (cascade delete).

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — ESLint
- `node scripts/seed-bookings.mjs` — Seed 80 dummy bookings into Supabase

## Conventions & Patterns

### Naming
- DB columns: `snake_case` (e.g., `bill_to_name`, `payment_status`)
- TypeScript types: `camelCase` (e.g., `billTo.name`, `invoice.status`)
- The mapping happens in `rowToBooking()` and `createBooking()` inside `supabaseService.ts`

### Component Structure
- Each major view has a `.tsx` + matching `.css` file (e.g., `AdminPanel.tsx` + `AdminPanel.css`)
- Invoice rendering uses `InvoicePreview.css` shared between `AdminInvoiceView` and `AgentInvoiceView`
- Admin uses inline-editable fields (`E`, `EC`, `ES` components inside `AdminInvoiceView.tsx`) — click-to-edit pattern
- Agent has read-only invoice view + separate edit form (only for `pending` bookings)

### Session Persistence
- Navigation state persisted to `sessionStorage` with `gtmg_*` prefixed keys (e.g., `gtmg_admin_nav`, `gtmg_agent_form`)
- This preserves tab state and form drafts across page refreshes

### Indonesian Locale Utilities
- `terbilang()` — converts numbers to Indonesian words + "Rupiah" suffix
- `formatRupiah()` / `formatRupiahFull()` — Indonesian number formatting (dot separators)
- `formatDateIndo()` — dates in "DD Bulan YYYY" format (e.g., "27 Februari 2026")
- `generateInvoiceNumber()` — format `INV/YYYYMMDD/XXX` (sequential, resets monthly)
- `generatePONumber()` — format `PO/GTMG/YYMM/XXX`

### Airports Data
- `src/data/airports.ts` contains 500+ airports (Indonesia-focused + Middle East + global) with IATA codes, used for autocomplete in booking forms

## Environment Variables

Required in `.env` (Vite-style `VITE_` prefix):
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<supabase-anon-key>
```

## Database

Schema defined in `supabase-schema.sql`. Tables: `access_keys`, `agents`, `bookings`, `passengers`, `company_settings`. RLS is enabled but uses permissive policies (app-level auth, not Supabase Auth). Realtime is enabled for `bookings` and `passengers` tables.

## Important Notes

- No test framework is configured — there are no tests
- No client-side routing library — navigation is state-driven via Context + sessionStorage
- Images (logo, signature) are stored as base64 data URLs directly in the database
- Passenger updates use delete-all-then-reinsert strategy (not individual upserts)
- Icons use Font Awesome (loaded via CDN in `index.html`), not a React icon library
