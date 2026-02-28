-- ============================================
-- TRAVEL PANEL - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. ACCESS KEYS (untuk login agent & admin)
CREATE TABLE IF NOT EXISTS access_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('agent', 'admin')),
  key_value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. AGENTS (profil data diri agent)
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  access_key_id UUID REFERENCES access_keys(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  -- flight
  flight_number TEXT NOT NULL DEFAULT '',
  route_from TEXT NOT NULL DEFAULT '',
  route_to TEXT NOT NULL DEFAULT '',
  route_from_detail TEXT NOT NULL DEFAULT '',
  route_to_detail TEXT NOT NULL DEFAULT '',
  departure_date TEXT NOT NULL DEFAULT '',
  departure_time TEXT NOT NULL DEFAULT '',
  -- bill to
  bill_to_name TEXT NOT NULL DEFAULT '',
  bill_to_phone TEXT NOT NULL DEFAULT '',
  bill_to_email TEXT NOT NULL DEFAULT '',
  -- invoice
  invoice_number TEXT NOT NULL DEFAULT '',
  invoice_date TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  po_number TEXT NOT NULL DEFAULT '',
  payment_status TEXT NOT NULL DEFAULT 'belum-lunas' CHECK (payment_status IN ('belum-lunas', 'lunas', 'dp')),
  payment_status_note TEXT NOT NULL DEFAULT '',
  -- financials
  price_per_pax NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  -- payment info
  bank_name TEXT NOT NULL DEFAULT 'Bank OCBC NISP',
  account_name TEXT NOT NULL DEFAULT 'PT Global Teknik Multi Guna',
  account_number TEXT NOT NULL DEFAULT '693800132377',
  -- company (bisa di-override per invoice)
  company_name TEXT NOT NULL DEFAULT 'PT GLOBAL TEKNIK MULTI GUNA',
  company_address TEXT NOT NULL DEFAULT 'Marelan Psr 1 Rel. Jl. Serba Jadi, KOTA MEDAN, Sumatera Utara 20245',
  company_phone TEXT NOT NULL DEFAULT '+62895320841777',
  company_email TEXT NOT NULL DEFAULT 'call@gtmgroup.co.id',
  company_website TEXT NOT NULL DEFAULT 'www.gtmgroup.co.id',
  company_logo_url TEXT NOT NULL DEFAULT '',
  company_signature_url TEXT NOT NULL DEFAULT '',
  signer_name TEXT NOT NULL DEFAULT 'Antasari',
  signer_position TEXT NOT NULL DEFAULT 'Direktur Utama',
  -- misc
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PASSENGERS
CREATE TABLE IF NOT EXISTS passengers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'MR',
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'ADT' CHECK (type IN ('ADT', 'CHD', 'INF')),
  dob TEXT NOT NULL DEFAULT '',
  passport TEXT NOT NULL DEFAULT '',
  passport_expiry TEXT NOT NULL DEFAULT '',
  e_ticket_number TEXT NOT NULL DEFAULT '',
  pnr TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_bookings_agent ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_passengers_booking ON passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_access_keys_role ON access_keys(role);
CREATE INDEX IF NOT EXISTS idx_agents_key ON agents(access_key_id);

-- ===== DEFAULT DATA =====
-- Default admin key
INSERT INTO access_keys (role, key_value, label) 
VALUES ('admin', 'admin123', 'Admin Utama')
ON CONFLICT (key_value) DO NOTHING;

-- Default agent key
INSERT INTO access_keys (role, key_value, label)
VALUES ('agent', 'agent123', 'Agent Default')
ON CONFLICT (key_value) DO NOTHING;

-- ===== ROW LEVEL SECURITY =====
-- Disable RLS for now (using publishable key, no auth)
ALTER TABLE access_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;

-- Allow all operations (since we use app-level auth, not Supabase auth)
CREATE POLICY "Allow all access_keys" ON access_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all passengers" ON passengers FOR ALL USING (true) WITH CHECK (true);

-- ===== AUTO UPDATE updated_at =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_access_keys BEFORE UPDATE ON access_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_agents BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_bookings BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== REALTIME =====
-- Enable realtime for bookings & passengers so all clients get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE passengers;

-- ===== MIGRATION: Hide Keterangan & Harga flags =====
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hide_keterangan BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hide_harga BOOLEAN DEFAULT FALSE;

-- ===== MIGRATION: Company Settings (global logo & TTD) =====
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url TEXT NOT NULL DEFAULT '',
  signature_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default single row
INSERT INTO company_settings (logo_url, signature_url)
SELECT '', ''
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all company_settings" ON company_settings FOR ALL USING (true) WITH CHECK (true);

-- Auto update timestamp
CREATE TRIGGER set_updated_at_company_settings BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== MIGRATION: Rename service_fee -> price_per_pax, passengers booking_ref -> pnr, remove price, add e_ticket_number =====
ALTER TABLE bookings RENAME COLUMN service_fee TO price_per_pax;
ALTER TABLE passengers RENAME COLUMN booking_ref TO pnr;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS e_ticket_number TEXT NOT NULL DEFAULT '';
ALTER TABLE passengers DROP COLUMN IF EXISTS price;
