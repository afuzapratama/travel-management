// ============================================
// SEED ADMIN ACCESS KEY
// Run: node scripts/seed-admin-key.mjs
// ============================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env manually (no dotenv dependency needed)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  process.env[key] = val;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('🔑 Seeding admin access key...\n');

  // Upsert admin key (won't duplicate if key_value already exists)
  const { data, error } = await supabase
    .from('access_keys')
    .upsert(
      { role: 'admin', key_value: 'natama2201', label: 'Admin Natama', is_active: true },
      { onConflict: 'key_value' }
    )
    .select()
    .single();

  if (error) {
    console.error('❌ Gagal membuat admin key:', error.message);
    process.exit(1);
  }

  console.log('✅ Admin access key berhasil dibuat!');
  console.log(`   Key   : natama2201`);
  console.log(`   Label : ${data.label}`);
  console.log(`   Role  : ${data.role}`);
  console.log(`   ID    : ${data.id}`);
  console.log(`\n🚀 Silakan login dengan key: natama2201`);
}

seed();
