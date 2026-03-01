// ============================================
// SUPABASE SERVICE LAYER
// Translates between DB rows ↔ App types
// All Supabase calls go through here
// ============================================

import { supabase } from './supabase';
import type { Booking, Passenger, BookingStatus, PaxTitle } from '../types/booking';

// ==========================================
// AUTH / ACCESS KEYS
// ==========================================

export interface AccessKey {
  id: string;
  role: 'agent' | 'admin';
  keyValue: string;
  label: string;
  isActive: boolean;
}

export interface Agent {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  accessKeyId: string | null;
  isActive: boolean;
}

/** Validate an access key and return role + agentId if matched */
export async function validateKey(key: string): Promise<{
  valid: boolean;
  role?: 'agent' | 'admin';
  keyId?: string;
  agent?: Agent;
}> {
  const { data, error } = await supabase
    .from('access_keys')
    .select('*')
    .eq('key_value', key)
    .eq('is_active', true)
    .single();

  if (error || !data) return { valid: false };

  // If agent key, also look up the agent profile
  let agent: Agent | undefined;
  if (data.role === 'agent') {
    const { data: agentRow } = await supabase
      .from('agents')
      .select('*')
      .eq('access_key_id', data.id)
      .eq('is_active', true)
      .single();
    if (agentRow) {
      agent = rowToAgent(agentRow);
    }
  }

  return {
    valid: true,
    role: data.role as 'agent' | 'admin',
    keyId: data.id,
    agent,
  };
}

// ==========================================
// ACCESS KEY CRUD (Admin)
// ==========================================

export async function getAllKeys(): Promise<AccessKey[]> {
  const { data, error } = await supabase
    .from('access_keys')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    role: r.role as 'agent' | 'admin',
    keyValue: r.key_value,
    label: r.label,
    isActive: r.is_active,
  }));
}

export async function createKey(role: 'agent' | 'admin', keyValue: string, label: string): Promise<AccessKey> {
  const { data, error } = await supabase
    .from('access_keys')
    .insert({ role, key_value: keyValue, label, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, role: data.role as 'agent' | 'admin', keyValue: data.key_value, label: data.label, isActive: data.is_active };
}

export async function updateKey(id: string, updates: { key_value?: string; label?: string; is_active?: boolean }): Promise<void> {
  const { error } = await supabase.from('access_keys').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteKey(id: string): Promise<void> {
  const { error } = await supabase.from('access_keys').delete().eq('id', id);
  if (error) throw error;
}

// ==========================================
// AGENT CRUD (Admin manages agents)
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAgent(r: any): Agent {
  return {
    id: r.id as string,
    name: r.name as string,
    companyName: r.company_name as string,
    phone: r.phone as string,
    email: r.email as string,
    address: r.address as string,
    accessKeyId: r.access_key_id as string | null,
    isActive: r.is_active as boolean,
  };
}

export async function getAllAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToAgent);
}

export async function createAgent(agent: Omit<Agent, 'id'>): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .insert({
      name: agent.name,
      company_name: agent.companyName,
      phone: agent.phone,
      email: agent.email,
      address: agent.address,
      access_key_id: agent.accessKeyId,
      is_active: agent.isActive,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToAgent(data);
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.companyName !== undefined) payload.company_name = updates.companyName;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.address !== undefined) payload.address = updates.address;
  if (updates.accessKeyId !== undefined) payload.access_key_id = updates.accessKeyId;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;

  const { error } = await supabase.from('agents').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteAgent(id: string): Promise<void> {
  const { error } = await supabase.from('agents').delete().eq('id', id);
  if (error) throw error;
}

// ==========================================
// BOOKING CRUD
// ==========================================

// ==========================================
// COMPANY SETTINGS (Global logo & TTD)
// ==========================================

export interface CompanySettings {
  id: string;
  logoUrl: string;
  signatureUrl: string;
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single();
  if (error || !data) return { id: '', logoUrl: '', signatureUrl: '' };
  return {
    id: data.id,
    logoUrl: data.logo_url || '',
    signatureUrl: data.signature_url || '',
  };
}

export async function updateCompanySettings(settings: { logoUrl?: string; signatureUrl?: string }): Promise<void> {
  // Get the single row
  const { data: existing } = await supabase
    .from('company_settings')
    .select('id')
    .limit(1)
    .single();

  const payload: Record<string, unknown> = {};
  if (settings.logoUrl !== undefined) payload.logo_url = settings.logoUrl;
  if (settings.signatureUrl !== undefined) payload.signature_url = settings.signatureUrl;

  if (existing) {
    const { error } = await supabase.from('company_settings').update(payload).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('company_settings').insert(payload);
    if (error) throw error;
  }
}

// ==========================================
// BOOKING CRUD (continued)
// ==========================================

/** Convert DB rows → app Booking type */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBooking(row: any, paxRows: any[]): Booking {
  return {
    id: row.id as string,
    agentId: row.agent_id as string | undefined,
    status: row.status as BookingStatus,
    flight: {
      flightNumber: row.flight_number as string,
      routeFrom: row.route_from as string,
      routeTo: row.route_to as string,
      routeFromDetail: row.route_from_detail as string,
      routeToDetail: row.route_to_detail as string,
      departureDate: row.departure_date as string,
      departureTime: row.departure_time as string,
    },
    passengers: paxRows
      .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      .map(p => ({
        id: p.id as string,
        title: ((p.title as string) || 'MR') as PaxTitle,
        name: p.name as string,
        type: p.type as Passenger['type'],
        dob: p.dob as string,
        passport: p.passport as string,
        passportExpiry: p.passport_expiry as string,
        eTicketNumber: (p.e_ticket_number as string) || '',
        pnr: (p.pnr as string) || '',
      })),
    billTo: {
      name: row.bill_to_name as string,
      phone: row.bill_to_phone as string,
      email: row.bill_to_email as string,
    },
    invoice: {
      invoiceNumber: row.invoice_number as string,
      invoiceDate: row.invoice_date as string,
      dueDate: row.due_date as string,
      poNumber: row.po_number as string,
      status: row.payment_status as Booking['invoice']['status'],
      statusNote: row.payment_status_note as string,
    },
    pricePerPax: Number(row.price_per_pax) || 0,
    discount: Number(row.discount) || 0,
    payment: {
      bankName: row.bank_name as string,
      accountName: row.account_name as string,
      accountNumber: row.account_number as string,
    },
    company: {
      name: row.company_name as string,
      address: row.company_address as string,
      phone: row.company_phone as string,
      email: row.company_email as string,
      website: row.company_website as string,
      logoUrl: row.company_logo_url as string,
      signatureUrl: row.company_signature_url as string,
      signerName: row.signer_name as string,
      signerPosition: row.signer_position as string,
    },
    notes: row.notes as string,
    hideKeterangan: row.hide_keterangan === true,
    hideHarga: row.hide_harga === true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string) || null,
  };
}

/** Fetch all bookings (optionally filtered by agent, excludes soft-deleted) */
export async function fetchBookings(agentId?: string): Promise<Booking[]> {
  let query = supabase.from('bookings').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  if (agentId) {
    query = query.eq('agent_id', agentId);
  }
  const { data: rows, error } = await query;
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Fetch all passengers for these bookings in one query
  const ids = rows.map(r => r.id);
  const { data: paxRows, error: paxErr } = await supabase
    .from('passengers')
    .select('*')
    .in('booking_id', ids)
    .order('sort_order', { ascending: true });
  if (paxErr) throw paxErr;

  // Group passengers by booking_id
  const paxMap = new Map<string, Record<string, unknown>[]>();
  for (const p of (paxRows || [])) {
    const list = paxMap.get(p.booking_id) || [];
    list.push(p);
    paxMap.set(p.booking_id, list);
  }

  return rows.map(r => rowToBooking(r, paxMap.get(r.id) || []));
}

/** Fetch single booking by ID */
export async function fetchBookingById(id: string): Promise<Booking | null> {
  const { data: row, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !row) return null;

  const { data: paxRows } = await supabase
    .from('passengers')
    .select('*')
    .eq('booking_id', id)
    .order('sort_order', { ascending: true });

  return rowToBooking(row, paxRows || []);
}

/** Create a new booking with passengers */
export async function createBooking(booking: Booking): Promise<Booking> {
  const { data: row, error } = await supabase
    .from('bookings')
    .insert({
      agent_id: booking.agentId || null,
      status: booking.status,
      flight_number: booking.flight.flightNumber,
      route_from: booking.flight.routeFrom,
      route_to: booking.flight.routeTo,
      route_from_detail: booking.flight.routeFromDetail,
      route_to_detail: booking.flight.routeToDetail,
      departure_date: booking.flight.departureDate,
      departure_time: booking.flight.departureTime,
      bill_to_name: booking.billTo.name,
      bill_to_phone: booking.billTo.phone,
      bill_to_email: booking.billTo.email,
      invoice_number: booking.invoice.invoiceNumber,
      invoice_date: booking.invoice.invoiceDate,
      due_date: booking.invoice.dueDate,
      po_number: booking.invoice.poNumber,
      payment_status: booking.invoice.status,
      payment_status_note: booking.invoice.statusNote,
      price_per_pax: booking.pricePerPax,
      discount: booking.discount,
      bank_name: booking.payment.bankName,
      account_name: booking.payment.accountName,
      account_number: booking.payment.accountNumber,
      company_name: booking.company.name,
      company_address: booking.company.address,
      company_phone: booking.company.phone,
      company_email: booking.company.email,
      company_website: booking.company.website,
      company_logo_url: booking.company.logoUrl,
      company_signature_url: booking.company.signatureUrl,
      signer_name: booking.company.signerName,
      signer_position: booking.company.signerPosition,
      notes: booking.notes,
      hide_keterangan: booking.hideKeterangan,
      hide_harga: booking.hideHarga,
    })
    .select()
    .single();

  if (error) throw error;

  // Insert passengers (only those with a name filled in)
  const filledPassengers = booking.passengers.filter(p => p.name.trim());
  if (filledPassengers.length > 0) {
    const paxInserts = filledPassengers.map((p, i) => ({
      booking_id: row.id,
      title: p.title || 'MR',
      name: p.name,
      type: p.type,
      dob: p.dob,
      passport: p.passport,
      passport_expiry: p.passportExpiry,
      e_ticket_number: p.eTicketNumber || '',
      pnr: p.pnr || '',
      sort_order: i,
    }));
    const { error: paxErr } = await supabase.from('passengers').insert(paxInserts);
    if (paxErr) throw paxErr;
  }

  // Re-fetch to get complete data with generated IDs
  return (await fetchBookingById(row.id))!;
}

/** Update booking + passengers (full replace) */
export async function updateBookingInDb(booking: Booking): Promise<void> {
  // Update booking row
  const { error } = await supabase
    .from('bookings')
    .update({
      agent_id: booking.agentId || null,
      status: booking.status,
      flight_number: booking.flight.flightNumber,
      route_from: booking.flight.routeFrom,
      route_to: booking.flight.routeTo,
      route_from_detail: booking.flight.routeFromDetail,
      route_to_detail: booking.flight.routeToDetail,
      departure_date: booking.flight.departureDate,
      departure_time: booking.flight.departureTime,
      bill_to_name: booking.billTo.name,
      bill_to_phone: booking.billTo.phone,
      bill_to_email: booking.billTo.email,
      invoice_number: booking.invoice.invoiceNumber,
      invoice_date: booking.invoice.invoiceDate,
      due_date: booking.invoice.dueDate,
      po_number: booking.invoice.poNumber,
      payment_status: booking.invoice.status,
      payment_status_note: booking.invoice.statusNote,
      price_per_pax: booking.pricePerPax,
      discount: booking.discount,
      bank_name: booking.payment.bankName,
      account_name: booking.payment.accountName,
      account_number: booking.payment.accountNumber,
      company_name: booking.company.name,
      company_address: booking.company.address,
      company_phone: booking.company.phone,
      company_email: booking.company.email,
      company_website: booking.company.website,
      company_logo_url: booking.company.logoUrl,
      company_signature_url: booking.company.signatureUrl,
      signer_name: booking.company.signerName,
      signer_position: booking.company.signerPosition,
      notes: booking.notes,
      hide_keterangan: booking.hideKeterangan,
      hide_harga: booking.hideHarga,
    })
    .eq('id', booking.id);

  if (error) throw error;

  // Replace passengers: delete all then re-insert (only filled ones)
  await supabase.from('passengers').delete().eq('booking_id', booking.id);

  const filledPax = booking.passengers.filter(p => p.name.trim());
  if (filledPax.length > 0) {
    const paxInserts = filledPax.map((p, i) => ({
      booking_id: booking.id,
      title: p.title || 'MR',
      name: p.name,
      type: p.type,
      dob: p.dob,
      passport: p.passport,
      passport_expiry: p.passportExpiry,
      e_ticket_number: p.eTicketNumber || '',
      pnr: p.pnr || '',
      sort_order: i,
    }));
    const { error: paxErr } = await supabase.from('passengers').insert(paxInserts);
    if (paxErr) throw paxErr;
  }
}

/** Soft-delete a booking (set deleted_at timestamp, data preserved) */
export async function deleteBookingFromDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Restore a soft-deleted booking */
export async function restoreBookingInDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
}

/** Permanently delete a booking (irreversible, passengers cascade) */
export async function permanentDeleteBookingFromDb(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
}

/** Fetch soft-deleted bookings (trash) */
export async function fetchDeletedBookings(): Promise<Booking[]> {
  const { data: rows, error } = await supabase
    .from('bookings')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const ids = rows.map(r => r.id);
  const { data: paxRows, error: paxErr } = await supabase
    .from('passengers')
    .select('*')
    .in('booking_id', ids)
    .order('sort_order', { ascending: true });
  if (paxErr) throw paxErr;

  const paxMap = new Map<string, Record<string, unknown>[]>();
  for (const p of (paxRows || [])) {
    const list = paxMap.get(p.booking_id) || [];
    list.push(p);
    paxMap.set(p.booking_id, list);
  }

  return rows.map(r => rowToBooking(r, paxMap.get(r.id) || []));
}
