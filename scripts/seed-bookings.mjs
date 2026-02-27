// ============================================
// SEED 80 DUMMY BOOKINGS
// Run: node scripts/seed-bookings.mjs
// Requires: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env
// ============================================

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config(); // load .env

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Helper data ---
const ROUTES = [
  { from: 'JED', to: 'CGK', fromD: 'Jeddah (King Abdulaziz Intl)', toD: 'Jakarta (Soekarno-Hatta Intl)' },
  { from: 'CGK', to: 'JED', fromD: 'Jakarta (Soekarno-Hatta Intl)', toD: 'Jeddah (King Abdulaziz Intl)' },
  { from: 'MED', to: 'CGK', fromD: 'Madinah (Prince Mohammad bin Abdulaziz)', toD: 'Jakarta (Soekarno-Hatta Intl)' },
  { from: 'CGK', to: 'MED', fromD: 'Jakarta (Soekarno-Hatta Intl)', toD: 'Madinah (Prince Mohammad bin Abdulaziz)' },
  { from: 'CGK', to: 'KNO', fromD: 'Jakarta (Soekarno-Hatta Intl)', toD: 'Medan (Kualanamu Intl)' },
  { from: 'KNO', to: 'CGK', fromD: 'Medan (Kualanamu Intl)', toD: 'Jakarta (Soekarno-Hatta Intl)' },
  { from: 'CGK', to: 'SUB', fromD: 'Jakarta (Soekarno-Hatta Intl)', toD: 'Surabaya (Juanda Intl)' },
  { from: 'CGK', to: 'DPS', fromD: 'Jakarta (Soekarno-Hatta Intl)', toD: 'Bali (Ngurah Rai Intl)' },
  { from: 'CGK', to: 'SIN', fromD: 'Jakarta (Soekarno-Hatta Intl)', toD: 'Singapore (Changi)' },
  { from: 'CGK', to: 'KUL', fromD: 'Jakarta (Soekarno-Hatta Intl)', toD: 'Kuala Lumpur (KLIA)' },
  { from: 'JED', to: 'MED', fromD: 'Jeddah (King Abdulaziz Intl)', toD: 'Madinah (Prince Mohammad bin Abdulaziz)' },
  { from: 'CGK', to: 'UPG', fromD: 'Jakarta (Soekarno-Hatta Intl)', toD: 'Makassar (Sultan Hasanuddin)' },
];

const FLIGHTS = ['SV826', 'SV818', 'SV832', 'GA301', 'GA888', 'QZ8501', 'JT610', 'ID6125', 'SQ952', 'MH721', 'SV840', 'GA410'];
const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
const STATUS_WEIGHTS = [20, 25, 30, 5]; // More completed/confirmed, less cancelled
const TITLES_ADT = ['MR', 'MRS', 'MS'];
const TITLES_CHD = ['MSTR', 'MISS'];

const FIRST_NAMES = [
  'AHMAD', 'BUDI', 'SITI', 'DEWI', 'RINA', 'HASAN', 'FATIMAH', 'MUHAMMAD', 'NURUL', 'AGUS',
  'WAHYU', 'PUTRI', 'RIZKI', 'ANA', 'DIAN', 'EKO', 'FAJAR', 'GALIH', 'HENDRA', 'INDRA',
  'JOKO', 'KARTINI', 'LESTARI', 'MEGA', 'NADIA', 'OKI', 'PUSPITA', 'RATNA', 'SURYA', 'TONO',
  'UDIN', 'VINA', 'WATI', 'YANTO', 'ZAHRA', 'BAMBANG', 'CINDY', 'DEDI', 'ELSA', 'FIRMAN',
  'GILANG', 'HANI', 'IRFAN', 'JASMINE', 'KIKI', 'LINDA', 'MELANI', 'NIKO', 'OLIVIA', 'PRASETYO',
];

const LAST_NAMES = [
  'ANUGRA', 'PRATAMA', 'HIDAYAT', 'SAPUTRA', 'RAHAYU', 'WIBOWO', 'SUSANTO', 'HARTONO', 'SETIAWAN', 'KURNIAWAN',
  'PERMANA', 'WIJAYA', 'HANDOKO', 'UTAMI', 'PURNAMA', 'SANTOSO', 'NUGROHO', 'SUHARTO', 'ISKANDAR', 'HAKIM',
  'BUDIMAN', 'CAHYONO', 'DARMAWAN', 'EFFENDI', 'FIRMANSYAH', 'GUNAWAN', 'HALIM', 'IRAWAN', 'JATMIKO', 'KUSNADI',
];

const EMAILS = ['gmail.com', 'yahoo.co.id', 'outlook.com', 'hotmail.com'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function padDate(d) { return d.toISOString().slice(0, 10); }

function genPassport() { return `A${rand(1000000, 9999999)}`; }

function genPhone() { return `08${rand(10, 99)}${rand(1000, 9999)}${rand(100, 999)}`; }

function randomDate(startMonthsAgo, endMonthsAgo) {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - startMonthsAgo);
  const end = new Date(now);
  end.setMonth(end.getMonth() - endMonthsAgo);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function futureDate(from, daysMin, daysMax) {
  const d = new Date(from);
  d.setDate(d.getDate() + rand(daysMin, daysMax));
  return d;
}

// --- Generate bookings ---
async function seed() {
  console.log('🌱 Seeding 80 dummy bookings...\n');

  // First, get agent ID
  const { data: agents } = await supabase.from('agents').select('id').limit(1);
  const agentId = agents?.[0]?.id || null;
  console.log(`Agent ID: ${agentId || '(none, will be null)'}`);

  let success = 0;
  let fail = 0;

  for (let i = 1; i <= 80; i++) {
    const route = pick(ROUTES);
    const flight = pick(FLIGHTS);
    const status = weightedPick(STATUSES, STATUS_WEIGHTS);

    const createdAt = randomDate(6, 0); // within last 6 months
    const depDate = futureDate(createdAt, 3, 45);
    const invDate = padDate(createdAt);
    const dueDate = padDate(futureDate(createdAt, 7, 14));

    const invNum = `INV/${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}/${String(i).padStart(3, '0')}`;
    const poNum = `PO/GTMG/${String(createdAt.getFullYear()).slice(2)}${String(createdAt.getMonth() + 1).padStart(2, '0')}/${String(i).padStart(3, '0')}`;

    const depHour = rand(0, 23);
    const depMin = rand(0, 11) * 5;
    const depTime = `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}`;

    const customerFirst = pick(FIRST_NAMES);
    const customerLast = pick(LAST_NAMES);
    const customerName = `${customerFirst} ${customerLast}`;
    const customerEmail = `${customerFirst.toLowerCase()}.${customerLast.toLowerCase()}@${pick(EMAILS)}`;

    // Generate 1-5 passengers
    const paxCount = rand(1, 5);
    const passengers = [];

    for (let p = 0; p < paxCount; p++) {
      const isChild = p > 0 && Math.random() < 0.2;
      const isInfant = !isChild && p > 1 && Math.random() < 0.1;
      const type = isInfant ? 'INF' : isChild ? 'CHD' : 'ADT';
      const titleOptions = type === 'ADT' ? TITLES_ADT : TITLES_CHD;
      const title = pick(titleOptions);
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);

      const dob = type === 'ADT'
        ? padDate(randomDate(600, 216)) // 18-50 years ago
        : type === 'CHD'
          ? padDate(randomDate(144, 24)) // 2-12 years ago
          : padDate(randomDate(24, 1)); // 0-2 years ago

      const passportExpiry = padDate(futureDate(new Date(), 180, 1800));

      passengers.push({
        title,
        name: `${firstName} ${lastName}`,
        type,
        dob,
        passport: genPassport(),
        passport_expiry: passportExpiry,
        booking_ref: '',
        price: type === 'ADT' ? rand(3500000, 12000000) : type === 'CHD' ? rand(2500000, 8000000) : rand(500000, 2000000),
        sort_order: p,
      });
    }

    const serviceFee = pick([0, 50000, 100000, 150000, 200000]);
    const discount = pick([0, 0, 0, 50000, 100000, 250000]);

    // Insert booking
    const { data: row, error } = await supabase
      .from('bookings')
      .insert({
        agent_id: agentId,
        status,
        flight_number: flight,
        route_from: route.from,
        route_to: route.to,
        route_from_detail: route.fromD,
        route_to_detail: route.toD,
        departure_date: padDate(depDate),
        departure_time: depTime,
        bill_to_name: customerName,
        bill_to_phone: genPhone(),
        bill_to_email: customerEmail,
        invoice_number: invNum,
        invoice_date: invDate,
        due_date: dueDate,
        po_number: poNum,
        payment_status: pick(['belum-lunas', 'lunas', 'dp']),
        payment_status_note: '',
        service_fee: serviceFee,
        discount: discount,
        bank_name: 'Bank Mandiri',
        account_name: 'PT Global Teknik Multi Guna',
        account_number: '1234567890',
        company_name: 'PT Global Teknik Multi Guna',
        company_address: 'Jakarta, Indonesia',
        company_phone: '021-12345678',
        company_email: 'info@gtmg.co.id',
        company_website: 'www.gtmg.co.id',
        company_logo_url: '',
        company_signature_url: '',
        signer_name: 'Admin GTMG',
        signer_position: 'Manager',
        notes: '',
        hide_keterangan: false,
        hide_harga: false,
        created_at: createdAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.log(`❌ Booking #${i}: ${error.message}`);
      fail++;
      continue;
    }

    // Insert passengers
    const paxInserts = passengers.map(p => ({ ...p, booking_id: row.id }));
    const { error: paxErr } = await supabase.from('passengers').insert(paxInserts);

    if (paxErr) {
      console.log(`⚠️  Booking #${i} OK tapi pax gagal: ${paxErr.message}`);
    } else {
      success++;
    }

    const bar = '█'.repeat(Math.floor(i / 80 * 30)).padEnd(30, '░');
    process.stdout.write(`\r  [${bar}] ${i}/80  ${status.padEnd(10)} ${route.from}→${route.to}  ${customerName.slice(0, 20).padEnd(20)}`);
  }

  console.log(`\n\n✅ Selesai! ${success} berhasil, ${fail} gagal.`);
}

seed().catch(console.error);
