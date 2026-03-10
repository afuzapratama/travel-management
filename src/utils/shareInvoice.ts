// ============================================
// SHARE INVOICE — Email & WhatsApp
// Utilities for sending invoices via various channels
// ============================================

import type { Booking } from '../types/booking';
import { buildInvoiceEmailHTML, buildInvoiceEmailSubject } from './invoiceEmail';
import { buildWhatsAppMessage, buildWhatsAppURL } from './whatsappMessage';

// API base URLs — configure in .env
const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:3001';
const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || '';

/**
 * Convert a Blob to base64 string (without data URL prefix).
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:application/pdf;base64," prefix
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Clean Indonesian phone number to international format (628xxx).
 */
function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('08')) cleaned = '62' + cleaned.slice(1);
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  return cleaned;
}

/**
 * Check if WhatsApp auto-send is available (VPS configured).
 */
export function isWhatsAppAutoSendAvailable(): boolean {
  return !!WHATSAPP_API_URL;
}

/**
 * Send invoice via email (calls backend API).
 */
export async function sendInvoiceEmail(
  booking: Booking,
  pdfBlob: Blob,
  pdfFileName: string,
  recipientEmail: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = buildInvoiceEmailHTML(booking);
    const subject = buildInvoiceEmailSubject(booking);
    const pdfBase64 = await blobToBase64(pdfBlob);

    const res = await fetch(`${EMAIL_API_URL}/api/send-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipientEmail,
        subject,
        html,
        pdfBase64,
        fileName: pdfFileName,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Gagal mengirim email' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Send invoice via WhatsApp automatically (calls n8n webhook on VPS).
 * Sends text message + PDF document via rotating instance pool.
 * n8n auto-discovers connected instances and round-robin rotates.
 */
export async function sendWhatsAppAuto(
  booking: Booking,
  phone: string,
  pdfBlob?: Blob,
  pdfFileName?: string,
): Promise<{ success: boolean; error?: string; instanceUsed?: string; totalInstances?: number }> {
  if (!WHATSAPP_API_URL) {
    return { success: false, error: 'WhatsApp API belum dikonfigurasi (VITE_WHATSAPP_API_URL)' };
  }

  try {
    const message = buildWhatsAppMessage(booking);
    const cleanedPhone = cleanPhone(phone);

    // Build payload
    const payload: Record<string, string> = {
      phone: cleanedPhone,
      message,
      pdfBase64: '',
      fileName: '',
    };

    // Attach PDF if available
    if (pdfBlob && pdfFileName) {
      payload.pdfBase64 = await blobToBase64(pdfBlob);
      payload.fileName = pdfFileName;
    }

    const res = await fetch(`${WHATSAPP_API_URL}/webhook/whatsapp-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Gagal mengirim WhatsApp',
        instanceUsed: data.instanceUsed || undefined,
        totalInstances: data.totalInstances || 0,
      };
    }
    return {
      success: true,
      instanceUsed: data.instanceUsed || undefined,
      totalInstances: data.totalInstances || 0,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Open WhatsApp with pre-filled invoice message.
 * Uses wa.me deep link — works on mobile & desktop.
 */
export function openWhatsApp(booking: Booking, phone?: string): void {
  const message = buildWhatsAppMessage(booking);
  const targetPhone = phone || booking.billTo.phone;

  if (targetPhone) {
    const url = buildWhatsAppURL(targetPhone, message);
    window.open(url, '_blank');
  } else {
    // No phone — open WhatsApp with message only (user picks contact)
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}

/**
 * Share invoice via Web Share API (mobile — can attach PDF).
 * Falls back to WhatsApp if Web Share is unavailable.
 */
export async function shareInvoiceNative(
  booking: Booking,
  pdfBlob: Blob,
  pdfFileName: string,
): Promise<boolean> {
  const message = buildWhatsAppMessage(booking);

  // Web Share API with file support (mobile)
  if (navigator.canShare) {
    const file = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
    const shareData: ShareData = {
      title: `Invoice ${booking.invoice.invoiceNumber || ''}`,
      text: message,
      files: [file],
    };

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (err) {
        // User cancelled share — not an error
        if ((err as Error).name === 'AbortError') return false;
        console.warn('Web Share failed, falling back to wa.me:', err);
      }
    }
  }

  // Fallback: just open WhatsApp
  openWhatsApp(booking);
  return true;
}
