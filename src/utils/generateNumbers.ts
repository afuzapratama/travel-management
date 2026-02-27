// ============================================
// AUTO-GENERATE Invoice Number & PO Number
// ============================================

import { supabase } from '../lib/supabase';

/**
 * Generate Invoice Number
 * Format: INV/YYYYMMDD/XXX
 * XXX = sequential number padded to 3 digits, resets monthly
 * Example: INV/20260227/001
 */
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `INV/${yyyy}${mm}`;

  // Count existing invoices this month to get next sequence
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `${prefix}%`);

  const seq = (error || count === null) ? 1 : count + 1;
  const seqStr = String(seq).padStart(3, '0');

  return `INV/${dateStr}/${seqStr}`;
}

/**
 * Generate PO Number
 * Format: PO/GTMG/YYMM/XXX
 * XXX = sequential number padded to 3 digits, resets monthly
 * Example: PO/GTMG/2602/001
 */
export async function generatePONumber(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PO/GTMG/${yy}${mm}`;

  // Count existing POs this month to get next sequence
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .like('po_number', `${prefix}%`);

  const seq = (error || count === null) ? 1 : count + 1;
  const seqStr = String(seq).padStart(3, '0');

  return `${prefix}/${seqStr}`;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
