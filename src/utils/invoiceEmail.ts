// ============================================
// INVOICE EMAIL TEMPLATE
// Simple notification — detail ada di PDF lampiran
// ============================================

import type { Booking } from '../types/booking';
import { formatRupiahFull } from './formatCurrency';
import { formatDateIndo } from './formatDate';

/**
 * Generate a clean, simple HTML email — just key info + "PDF terlampir".
 */
export function buildInvoiceEmailHTML(booking: Booking): string {
  const grandTotal = (booking.pricePerPax * booking.passengers.length) - booking.discount;
  const showHarga = !booking.hideHarga;

  const route = booking.flight.routeFrom && booking.flight.routeTo
    ? `${booking.flight.routeFrom} — ${booking.flight.routeTo}`
    : '-';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #e0e0e0;">

        <!-- Header -->
        <tr>
          <td style="background-color:#1a2332;padding:24px 32px;color:#ffffff;">
            <h1 style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${booking.company.name}</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#b0b8c4;">${booking.company.phone} | ${booking.company.email}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.6;">
              Yth. <strong>${booking.billTo.name || 'Pelanggan'}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#555555;line-height:1.6;">
              Berikut kami kirimkan invoice untuk pemesanan tiket pesawat Anda. Detail lengkap dapat dilihat pada file PDF yang terlampir.
            </p>

            <!-- Summary Card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border:1px solid #eeeeee;margin-bottom:24px;">
              <tr><td style="padding:20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#555555;">
                  <tr>
                    <td style="padding:6px 0;color:#888888;">No. Invoice</td>
                    <td align="right" style="padding:6px 0;font-weight:bold;color:#1a2332;">${booking.invoice.invoiceNumber || '-'}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#888888;">Tanggal</td>
                    <td align="right" style="padding:6px 0;">${booking.invoice.invoiceDate ? formatDateIndo(booking.invoice.invoiceDate) : '-'}</td>
                  </tr>
                  ${booking.invoice.dueDate ? `
                  <tr>
                    <td style="padding:6px 0;color:#888888;">Jatuh Tempo</td>
                    <td align="right" style="padding:6px 0;color:#D63031;font-weight:bold;">${formatDateIndo(booking.invoice.dueDate)}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:6px 0;color:#888888;">Rute</td>
                    <td align="right" style="padding:6px 0;">${route}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#888888;">Penumpang</td>
                    <td align="right" style="padding:6px 0;">${booking.passengers.length} orang</td>
                  </tr>
                  ${showHarga ? `
                  <tr>
                    <td style="padding:12px 0 6px;border-top:1px solid #dddddd;font-weight:bold;color:#1a2332;font-size:15px;">Total</td>
                    <td align="right" style="padding:12px 0 6px;border-top:1px solid #dddddd;font-weight:bold;color:#1a2332;font-size:15px;">${formatRupiahFull(grandTotal)}</td>
                  </tr>` : ''}
                </table>
              </td></tr>
            </table>

            <p style="margin:0;font-size:13px;color:#888888;text-align:center;">
              Invoice lengkap terlampir dalam format PDF
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8f9fa;padding:16px 32px;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999999;">
              ${booking.company.name}${booking.company.website ? ` &mdash; ${booking.company.website}` : ''}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plain text subject line for the invoice email.
 */
export function buildInvoiceEmailSubject(booking: Booking): string {
  const inv = booking.invoice.invoiceNumber || 'Draft';
  const route = booking.flight.routeFrom && booking.flight.routeTo
    ? ` | ${booking.flight.routeFrom}-${booking.flight.routeTo}`
    : '';
  return `Invoice ${inv}${route} — ${booking.company.name}`;
}
