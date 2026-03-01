// ============================================
// MIGRATION: Add soft-delete support (deleted_at column)
// Run: node scripts/migrate-soft-delete.mjs
// ============================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

// We need the service_role key to run DDL. If not available, 
// user must run the SQL manually in Supabase SQL Editor.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📦 Migration: Soft-Delete Support\n');
console.log('This migration adds a "deleted_at" column to the bookings table.');
console.log('Bookings with deleted_at != NULL are considered "soft-deleted".\n');

if (!SERVICE_KEY) {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.log('   Please run this SQL manually in your Supabase SQL Editor:\n');
  console.log('   ──────────────────────────────────────────────');
  console.log('   ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;');
  console.log('   CREATE INDEX IF NOT EXISTS idx_bookings_deleted ON bookings(deleted_at);');
  console.log('   ──────────────────────────────────────────────\n');
  console.log('   After running the SQL, the soft-delete feature will work automatically.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

try {
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;'
  });
  if (e1) throw new Error(e1.message);

  const { error: e2 } = await supabase.rpc('exec_sql', {
    sql: 'CREATE INDEX IF NOT EXISTS idx_bookings_deleted ON bookings(deleted_at);'
  });
  if (e2) throw new Error(e2.message);

  console.log('✅ Migration completed successfully!');
  console.log('   - Added column: bookings.deleted_at');
  console.log('   - Added index: idx_bookings_deleted');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  console.log('\n   Please run this SQL manually in your Supabase SQL Editor:\n');
  console.log('   ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;');
  console.log('   CREATE INDEX IF NOT EXISTS idx_bookings_deleted ON bookings(deleted_at);');
}
