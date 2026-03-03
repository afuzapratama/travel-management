// ============================================
// WHATSAPP MESSAGE FORMATTER
// Builds formatted invoice text for WhatsApp
// Uses WhatsApp text formatting: *bold* _italic_
// ============================================

import type { Booking } from '../types/booking';
import { formatRupiahFull } from './formatCurrency';
import { formatDateIndo } from './formatDate';
import { terbilang } from './terbilang';

/**
 * Build a formatted WhatsApp message from a Booking.
 * WhatsApp supports: *bold*, _italic_, ~strikethrough~, ```monospace```
 */
export function buildWhatsAppMessage(booking: Booking): string {
  const payStatusText: Record<string, string> = {
    'belum-lunas': '🔴 Belum Lunas',
    'lunas': '🟢 Lunas',
    'dp': '🟡 DP',
  };

  // Build message — ringkas, detail lengkap ada di PDF
  const lines: string[] = [
    `*INVOICE — ${booking.company.name}*`,
    ``,
    `📄 *No. Invoice:* ${booking.invoice.invoiceNumber || '-'}`,
    `📅 Tanggal: ${booking.invoice.invoiceDate ? formatDateIndo(booking.invoice.invoiceDate) : '-'}`,
    `⏰ Jatuh Tempo: ${booking.invoice.dueDate ? formatDateIndo(booking.invoice.dueDate) : '-'}`,
    booking.invoice.poNumber ? `📋 No. PO: ${booking.invoice.poNumber}` : '',
    `💳 Status: ${payStatusText[booking.invoice.status] || booking.invoice.status}${booking.invoice.statusNote ? ` — ${booking.invoice.statusNote}` : ''}`,
    ``,
    `✈️ *Detail Penerbangan*`,
    `${booking.flight.flightNumber || '-'} | ${booking.flight.routeFrom || '?'} → ${booking.flight.routeTo || '?'}`,
    `📅 ${booking.flight.departureDate ? formatDateIndo(booking.flight.departureDate) : '-'} 🕐 ${booking.flight.departureTime || '-'}`,
  ];

  if (booking.flight.routeFromDetail || booking.flight.routeToDetail) {
    lines.push(`${booking.flight.routeFromDetail || ''} → ${booking.flight.routeToDetail || ''}`);
  }

  lines.push('');
  lines.push(`👥 Penumpang: ${booking.passengers.length} pax`);

  const isLunas = booking.invoice.status === 'lunas';

  // Rincian harga & pembayaran — hanya tampil jika belum lunas
  if (!isLunas) {
    const subtotal = booking.pricePerPax * booking.passengers.length;
    const grandTotal = subtotal - booking.discount;

    lines.push('');
    lines.push(`💰 *Rincian Harga*`);
    lines.push(`Harga/pax: ${formatRupiahFull(booking.pricePerPax)}`);
    if (booking.discount > 0) {
      lines.push(`Diskon: -${formatRupiahFull(booking.discount)}`);
    }
    lines.push(`*Total: ${formatRupiahFull(grandTotal)}*`);
    lines.push(`_${terbilang(grandTotal)}_`);

    lines.push('');
    lines.push(`🏦 *Pembayaran*`);
    lines.push(`Bank: ${booking.payment.bankName}`);
    lines.push(`A/N: ${booking.payment.accountName}`);
    lines.push(`No. Rek: ${booking.payment.accountNumber}`);
  }

  if (booking.billTo.name) {
    lines.push('');
    lines.push(`📌 *Ditagihkan Kepada*`);
    lines.push(`${booking.billTo.name}`);
    if (booking.billTo.phone) lines.push(`📞 ${booking.billTo.phone}`);
    if (booking.billTo.email) lines.push(`✉️ ${booking.billTo.email}`);
  }

  lines.push('');
  lines.push(`📎 _Invoice PDF terlampir_`);
  lines.push('');
  lines.push(`— _${booking.company.name}_`);
  if (booking.company.website) lines.push(`🌐 ${booking.company.website}`);

  // Filter empty lines that are back-to-back (trim excess)
  return lines.filter(l => l !== undefined).join('\n');
}

/**
 * Build the wa.me URL to open WhatsApp with a pre-filled message.
 * @param phone - Phone number (can include +, spaces, dashes)
 * @param message - Pre-filled message text
 */
export function buildWhatsAppURL(phone: string, message: string): string {
  // Clean phone number: remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '');

  // Convert Indonesian local format (08xx) to international (+628xx)
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  }
  // Remove leading + if present (wa.me uses without +)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}
