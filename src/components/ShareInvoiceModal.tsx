// ============================================
// SHARE INVOICE MODAL
// Send invoice via Email or WhatsApp
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Booking } from '../types/booking';
import { generatePDFBlob } from '../utils/exportPdf';
import { sendInvoiceEmail, openWhatsApp, shareInvoiceNative, sendWhatsAppAuto, isWhatsAppAutoSendAvailable } from '../utils/shareInvoice';
import { buildWhatsAppMessage } from '../utils/whatsappMessage';
import './ShareInvoiceModal.css';

type ShareTab = 'email' | 'whatsapp';

interface Props {
  booking: Booking;
  invoiceRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export default function ShareInvoiceModal({ booking, invoiceRef, onClose }: Props) {
  const [tab, setTab] = useState<ShareTab>('email');
  const [email, setEmail] = useState(booking.billTo.email || '');
  const [phone, setPhone] = useState(booking.billTo.phone || '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Focus email input on open
  useEffect(() => {
    if (tab === 'email') emailRef.current?.focus();
  }, [tab]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // ===== SEND EMAIL =====
  const handleSendEmail = async () => {
    if (!email.trim()) {
      setResult({ type: 'error', msg: 'Masukkan alamat email tujuan' });
      return;
    }
    if (!invoiceRef.current) return;

    setSending(true);
    setResult(null);

    try {
      // Generate PDF blob
      const name = booking.invoice.invoiceNumber?.replace(/[/\\]/g, '_') || booking.id.slice(0, 8);
      const { blob, fileName } = await generatePDFBlob(invoiceRef.current, `Invoice_${name}`);

      // Send via API
      const res = await sendInvoiceEmail(booking, blob, fileName, email.trim());

      if (res.success) {
        setResult({ type: 'success', msg: `Email berhasil dikirim ke ${email}` });
      } else {
        setResult({ type: 'error', msg: res.error || 'Gagal mengirim email' });
      }
    } catch (err) {
      setResult({ type: 'error', msg: (err as Error).message });
    }

    setSending(false);
  };

  // ===== SEND WHATSAPP =====
  const autoSendAvailable = isWhatsAppAutoSendAvailable();

  const handleWhatsApp = async () => {
    if (!invoiceRef.current) return;

    setSending(true);
    setResult(null);

    try {
      // Auto-send via VPS (n8n + Evolution API) if configured
      if (autoSendAvailable) {
        const targetPhone = phone.trim() || booking.billTo.phone || '';
        if (!targetPhone) {
          setResult({ type: 'error', msg: 'Masukkan nomor WhatsApp tujuan' });
          setSending(false);
          return;
        }

        // Generate PDF
        const name = booking.invoice.invoiceNumber?.replace(/[/\\]/g, '_') || booking.id.slice(0, 8);
        const { blob, fileName } = await generatePDFBlob(invoiceRef.current, `Invoice_${name}`);

        // Send via n8n webhook (auto — rotating sender)
        const res = await sendWhatsAppAuto(booking, targetPhone, blob, fileName);
        if (res.success) {
          const instanceInfo = res.instanceUsed
            ? ` via ${res.instanceUsed}` + (res.totalInstances && res.totalInstances > 1 ? ` (${res.totalInstances} instance aktif)` : '')
            : '';
          setResult({ type: 'success', msg: `WhatsApp berhasil dikirim ke ${targetPhone}${instanceInfo}` });
        } else {
          setResult({ type: 'error', msg: res.error || 'Gagal mengirim WhatsApp' });
        }
      } else {
        // Fallback: wa.me deep link (manual send)
        const isMobile = window.innerWidth <= 900;
        if (isMobile) {
          const name = booking.invoice.invoiceNumber?.replace(/[/\\]/g, '_') || booking.id.slice(0, 8);
          const { blob, fileName } = await generatePDFBlob(invoiceRef.current, `Invoice_${name}`);
          await shareInvoiceNative(booking, blob, fileName);
        } else {
          openWhatsApp(booking, phone.trim() || undefined);
        }
        setResult({ type: 'success', msg: 'WhatsApp terbuka di tab baru' });
      }
    } catch (err) {
      setResult({ type: 'error', msg: (err as Error).message });
    }

    setSending(false);
  };

  // WhatsApp message preview (truncated)
  const waPreview = buildWhatsAppMessage(booking);
  const previewLines = waPreview.split('\n').slice(0, 12).join('\n') + '\n...';

  return (
    <div className="sim-overlay" onClick={handleOverlayClick}>
      <div className="sim-modal" ref={modalRef}>
        {/* Header */}
        <div className="sim-header">
          <h3><i className="fa-solid fa-share-nodes"></i> Kirim Invoice</h3>
          <button className="sim-close" onClick={onClose} title="Tutup">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="sim-tabs">
          <button className={`sim-tab ${tab === 'email' ? 'active' : ''}`} onClick={() => { setTab('email'); setResult(null); }}>
            <i className="fa-solid fa-envelope"></i> Email
          </button>
          <button className={`sim-tab ${tab === 'whatsapp' ? 'active' : ''}`} onClick={() => { setTab('whatsapp'); setResult(null); }}>
            <i className="fa-brands fa-whatsapp"></i> WhatsApp
          </button>
        </div>

        {/* Content */}
        <div className="sim-body">
          {tab === 'email' ? (
            <>
              <div className="sim-field">
                <label>Email Tujuan</label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="customer@email.com"
                  onKeyDown={e => { if (e.key === 'Enter' && !sending) handleSendEmail(); }}
                />
              </div>
              <div className="sim-info">
                <i className="fa-solid fa-circle-info"></i>
                Email berisi ringkasan invoice dengan file PDF terlampir
              </div>
            </>
          ) : (
            <>
              <div className="sim-field">
                <label>Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="sim-preview">
                <label>Preview Pesan</label>
                <pre>{previewLines}</pre>
              </div>
              <div className="sim-info">
                <i className="fa-solid fa-circle-info"></i>
                {autoSendAvailable
                  ? 'Pesan teks + file PDF invoice dikirim otomatis via WhatsApp'
                  : window.innerWidth <= 900
                    ? 'Di mobile, PDF bisa dikirim bersama pesan melalui Share'
                    : 'Membuka WhatsApp Web dengan pesan terisi otomatis'}
              </div>
            </>
          )}

          {/* Result */}
          {result && (
            <div className={`sim-result ${result.type}`}>
              <i className={`fa-solid ${result.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              {result.msg}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sim-footer">
          <button className="sim-btn cancel" onClick={onClose}>Batal</button>
          {tab === 'email' ? (
            <button className="sim-btn send email" onClick={handleSendEmail} disabled={sending}>
              {sending ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</> :
                <><i className="fa-solid fa-paper-plane"></i> Kirim Email</>}
            </button>
          ) : (
            <button className="sim-btn send whatsapp" onClick={handleWhatsApp} disabled={sending}>
              {sending ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</> :
                autoSendAvailable
                  ? <><i className="fa-brands fa-whatsapp"></i> Kirim WhatsApp</>
                  : <><i className="fa-brands fa-whatsapp"></i> Buka WhatsApp</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
