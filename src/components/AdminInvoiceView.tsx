// ============================================
// ADMIN INVOICE VIEW
// Full invoice template with inline editing
// No sidebar form — edit directly in the invoice
// ============================================

import { useState, useRef, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import type { Booking, BookingStatus } from '../types/booking';
import { formatRupiah, parseRupiahInput } from '../utils/formatCurrency';
import { terbilang } from '../utils/terbilang';
import { formatDateSlash } from '../utils/formatDate';
import { exportToPDF } from '../utils/exportPdf';
import '../components/InvoicePreview.css';
import './AdminInvoiceView.css';

// ===== INLINE EDITABLE FIELD =====
function E({ value, onChange, placeholder = '—', className = '', style, type = 'text', displayValue }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  className?: string; style?: CSSProperties; type?: string; displayValue?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTemp(value); }, [value]);
  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select(); } }, [editing]);
  const save = () => { onChange(temp); setEditing(false); };
  if (editing) {
    return <input ref={ref} type={type} value={temp} className={`ei ${className}`} style={style}
      onChange={e => setTemp(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setTemp(value); setEditing(false); } }} />;
  }
  const shown = displayValue ?? value;
  return <span className={`ef ${className} ${!value ? 'empty' : ''}`} style={style}
    onClick={() => { setTemp(value); setEditing(true); }}>{shown || placeholder}</span>;
}

// ===== INLINE EDITABLE CURRENCY =====
function EC({ value, onChange, className = '' }: {
  value: number; onChange: (v: number) => void; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value ? formatRupiah(value) : '');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTemp(value ? formatRupiah(value) : ''); }, [value]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select(); } }, [editing]);
  const save = () => { onChange(parseRupiahInput(temp)); setEditing(false); };
  if (editing) {
    return <input ref={ref} type="text" value={temp} className={`ei ei-currency ${className}`}
      onChange={e => setTemp(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setTemp(value ? formatRupiah(value) : ''); setEditing(false); } }} />;
  }
  return <span className={`ef ef-currency ${className} ${!value ? 'empty' : ''}`}
    onClick={() => { setTemp(value ? formatRupiah(value) : ''); setEditing(true); }}>{value ? formatRupiah(value) : '0'}</span>;
}

// ===== EDITABLE SELECT =====
function ES({ value, onChange, options, className = '' }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string | ReactNode }[]; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <span className={`ef ef-select ${className}`} onClick={() => setOpen(!open)} style={{ position: 'relative' }}>
      {current?.label || value}
      {open && (
        <div className="ef-dropdown">
          {options.map(o => (
            <div key={o.value} className={`ef-opt ${o.value === value ? 'active' : ''}`}
              onClick={e => { e.stopPropagation(); onChange(o.value); setOpen(false); }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

// ===== COPYABLE READ-ONLY FIELD (agent data) =====
function C({ value, placeholder = '—', className = '', copyValue }: {
  value: string; placeholder?: string; className?: string; copyValue?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = value || placeholder;
  const isEmpty = !value;
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(copyValue ?? value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <span className={`cf ${className} ${isEmpty ? 'cf-empty' : ''}`} onClick={handleCopy} title={value ? 'Klik untuk copy' : ''}>
      {text}
      {copied && <span className="cf-toast"><i className="fa-solid fa-check"></i> Copied</span>}
    </span>
  );
}

// ===== CUSTOM STATUS SELECT (with FA icons) =====
function CustomStatusSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; icon: string; label: string; color: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value) || options[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="custom-status-select" ref={ref}>
      <button className="css-trigger" onClick={() => setOpen(!open)}>
        <span className="css-dot" style={{ background: current.color }}></span>
        <i className={`fa-solid ${current.icon}`} style={{ color: current.color }}></i>
        <span>{current.label}</span>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} css-arrow`}></i>
      </button>
      {open && (
        <div className="css-dropdown">
          {options.map(o => (
            <button key={o.value} className={`css-option ${o.value === value ? 'active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              <i className={`fa-solid ${o.icon}`} style={{ color: o.color }}></i>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== MAIN COMPONENT =====
interface Props { bookingId: string; onBack: () => void; }

export default function AdminInvoiceView({ bookingId, onBack }: Props) {
  const { bookings, updateBooking, companySettings } = useApp();
  const [booking, setBooking] = useState<Booking>(() => bookings.find(b => b.id === bookingId)!);
  const [exporting, setExporting] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  // Close note popup on outside click
  useEffect(() => {
    if (!showNote) return;
    const handler = (e: MouseEvent) => {
      if (noteRef.current && !noteRef.current.contains(e.target as Node)) setShowNote(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNote]);

  // Derive show/hide from booking
  const showKeterangan = !booking?.hideKeterangan;
  const showHarga = !booking?.hideHarga;

  // Sync booking when bookings load (e.g. after page reload)
  useEffect(() => {
    if (!booking && bookings.length > 0) {
      const found = bookings.find(b => b.id === bookingId);
      if (found) setBooking(found); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [bookings, bookingId, booking]);

  // Auto-save with debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!booking) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateBooking(booking).catch(err => console.error('Auto-save failed:', err));
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [booking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Updater helper
  const u = useCallback(<K extends keyof Booking>(key: K, value: Booking[K]) => {
    setBooking(p => ({ ...p, [key]: value }));
  }, []);

  const uInv = useCallback((field: string, value: string) => {
    setBooking(p => ({ ...p, invoice: { ...p.invoice, [field]: value } }));
  }, []);

  const uPay = useCallback((field: string, value: string) => {
    setBooking(p => ({ ...p, payment: { ...p.payment, [field]: value } }));
  }, []);

  const uComp = useCallback((field: string, value: string) => {
    setBooking(p => ({ ...p, company: { ...p.company, [field]: value } }));
  }, []);

  const uPax = useCallback((id: string, field: string, value: string | number) => {
    setBooking(p => ({
      ...p,
      passengers: p.passengers.map(x => x.id === id ? { ...x, [field]: value } : x),
    }));
  }, []);

  // Calculations
  const subtotal = booking.pricePerPax * booking.passengers.length;
  const grandTotal = subtotal - booking.discount;

  // PDF Export
  const handleExport = async () => {
    if (!invoiceRef.current) return;
    setExporting(true);
    try {
      const name = booking.invoice.invoiceNumber?.replace(/[/\\]/g, '_') || booking.id.slice(0, 8);
      await exportToPDF(invoiceRef.current, `Invoice_${name}`);
    } catch (err) {
      alert('Gagal export: ' + (err as Error).message);
    }
    setExporting(false);
  };

  // Global logo & TTD from company settings
  const globalLogo = companySettings?.logoUrl || '';
  const globalSignature = companySettings?.signatureUrl || '';

  const payStatusOpts = [
    { value: 'belum-lunas', label: <span style={{ color: '#D63031' }}><i className="fa-solid fa-circle"></i> Belum Lunas</span> },
    { value: 'lunas', label: <span style={{ color: '#00B894' }}><i className="fa-solid fa-circle-check"></i> Lunas</span> },
    { value: 'dp', label: <span style={{ color: '#D4A843' }}><i className="fa-solid fa-circle-half-stroke"></i> DP</span> },
  ];

  if (!booking) return <div className="panel-container"><p>Booking tidak ditemukan</p></div>;

  return (
    <div className="aiv-container">
      {/* ===== ACTION BAR ===== */}
      <div className="aiv-actionbar">
        <div className="aiv-actions-left">
          <button className="aiv-back" onClick={onBack}>
            <i className="fa-solid fa-arrow-left"></i> Kembali
          </button>
          {booking.notes && (
            <div className="aiv-note-wrapper" ref={noteRef}>
              <button className={`aiv-btn aiv-note-btn ${showNote ? 'active' : ''}`} onClick={() => setShowNote(p => !p)} title="Catatan dari Agent">
                <i className="fa-solid fa-note-sticky"></i> Note
              </button>
              {showNote && (
                <div className="aiv-note-popup">
                  <div className="aiv-note-header">
                    <i className="fa-solid fa-note-sticky"></i> Catatan dari Agent
                  </div>
                  <div className="aiv-note-body">{booking.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="aiv-actions-center">
          <CustomStatusSelect
            value={booking.status}
            onChange={v => u('status', v as BookingStatus)}
            options={[
              { value: 'pending', icon: 'fa-clock', label: 'Pending', color: '#FDCB6E' },
              { value: 'confirmed', icon: 'fa-plane', label: 'Dikonfirmasi', color: '#2E86AB' },
              { value: 'completed', icon: 'fa-circle-check', label: 'Selesai', color: '#00B894' },
              { value: 'cancelled', icon: 'fa-circle-xmark', label: 'Dibatalkan', color: '#D63031' },
            ]}
          />
        </div>
        <div className="aiv-actions-right">
          <button className={`aiv-btn toggle ${showKeterangan ? 'toggle-on' : 'toggle-off'}`} onClick={() => setBooking(p => ({ ...p, hideKeterangan: !p.hideKeterangan }))} title="Tampilkan / Sembunyikan Keterangan">
            <i className={`fa-solid ${showKeterangan ? 'fa-eye' : 'fa-eye-slash'}`}></i> Keterangan
          </button>
          <button className={`aiv-btn toggle ${showHarga ? 'toggle-on' : 'toggle-off'}`} onClick={() => setBooking(p => ({ ...p, hideHarga: !p.hideHarga }))} title="Tampilkan / Sembunyikan Kolom Harga">
            <i className={`fa-solid ${showHarga ? 'fa-eye' : 'fa-eye-slash'}`}></i> Harga
          </button>
          <span className="aiv-separator"></span>
          <button className="aiv-btn secondary" onClick={() => window.print()}>
            <i className="fa-solid fa-print"></i> Print
          </button>
          <button className="aiv-btn primary" onClick={handleExport} disabled={exporting}>
            {exporting ? <><i className="fa-solid fa-spinner fa-spin"></i> PDF...</> :
              <><i className="fa-solid fa-file-pdf"></i> Export PDF</>}
          </button>
        </div>
      </div>

      {/* ===== INVOICE PAGE ===== */}
      <div className="aiv-preview-area">
        <div className="invoice-page" ref={invoiceRef} id="invoicePage">
          <div className="top-bar"></div>
          <div className="watermark">INVOICE</div>
          <div className="side-accent"></div>

          {/* HEADER */}
          <div className="invoice-header">
            <div className="company-info">
              {globalLogo && (
                <img src={globalLogo} alt="Logo" className="company-logo"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div className="company-details">
                <h1>
                  <E value={booking.company.name} onChange={v => uComp('name', v)} placeholder="NAMA PERUSAHAAN" />
                </h1>
                <p><i className="fa-solid fa-phone"></i> <E value={booking.company.phone} onChange={v => uComp('phone', v)} /></p>
                <p><i className="fa-solid fa-envelope"></i> <E value={booking.company.email} onChange={v => uComp('email', v)} /></p>
              </div>
            </div>
            <div className="invoice-title-box">
              <h2>INVOICE</h2>
              <div className="invoice-number">
                {booking.invoice.invoiceNumber || <span className="inv-placeholder">INV/____/__/___</span>}
              </div>
            </div>
          </div>

          <div className="divider"></div>

          {/* BILL TO + META */}
          <div className="bill-section">
            <div className="bill-box">
              <div className="bill-box-label">Ditagihkan Kepada / Bill To</div>
              <h3><C value={booking.billTo.name} placeholder="NAMA PELANGGAN" /></h3>
              <p>
                Telp: <C value={booking.billTo.phone} placeholder="-" /><br />
                Email: <C value={booking.billTo.email} placeholder="-" />
              </p>
            </div>
            <div className="bill-box invoice-meta">
              <div className="bill-box-label">Detail Invoice</div>
              <div className="meta-row">
                <span className="label">Tanggal Invoice</span>
                <span className="value meta-readonly">{booking.invoice.invoiceDate ? formatDateSlash(booking.invoice.invoiceDate) : '—'}</span>
              </div>
              <div className="meta-row">
                <span className="label">Jatuh Tempo</span>
                <span className="value"><E value={booking.invoice.dueDate} onChange={v => uInv('dueDate', v)} type="date" placeholder="Isi tanggal..." displayValue={booking.invoice.dueDate ? formatDateSlash(booking.invoice.dueDate) : ''} /></span>
              </div>
              <div className="meta-row">
                <span className="label">No. PO</span>
                <span className="value meta-readonly">{booking.invoice.poNumber || '—'}</span>
              </div>
              <div className="meta-row">
                <span className="label">Status</span>
                <span className="value">
                  <ES value={booking.invoice.status} onChange={v => uInv('status', v)} options={payStatusOpts} />
                  {' '}<E value={booking.invoice.statusNote} onChange={v => uInv('statusNote', v)} placeholder="" className="status-note-edit" />
                </span>
              </div>
            </div>
          </div>

          {/* ===== FLIGHT INFO BAR (NEW) ===== */}
          <div className="flight-info-bar">
            <div className="fi-item">
              <span className="fi-label">Flight</span>
              <span className="fi-value"><C value={booking.flight.flightNumber} /></span>
            </div>
            <div className="fi-item">
              <span className="fi-label">Route</span>
              <span className="fi-value">
                <C value={booking.flight.routeFrom} placeholder="___" />
                {' → '}
                <C value={booking.flight.routeTo} placeholder="___" />
              </span>
            </div>
            <div className="fi-item">
              <span className="fi-label">Departure Date</span>
              <span className="fi-value">
                <C value={booking.flight.departureDate ? formatDateSlash(booking.flight.departureDate) : ''} />
              </span>
            </div>
            <div className="fi-item">
              <span className="fi-label">Time</span>
              <span className="fi-value"><C value={booking.flight.departureTime} placeholder="--:--" /></span>
            </div>
            <div className="fi-item">
              <span className="fi-label">Total Pax</span>
              <span className="fi-value fi-pax">{booking.passengers.length}</span>
            </div>
          </div>

          {/* ===== TICKET TABLE (4 columns) ===== */}
          <div className="table-section">
            <div className="section-title">
              <span className="icon"><i className="fa-solid fa-plane"></i></span>
              Detail Tiket Pesawat
            </div>
            <table className="ticket-table new-layout">
              <thead>
                <tr>
                  <th className="col-no">No</th>
                  <th className="col-name">Nama Penumpang</th>
                  <th className="col-eticket">E-Ticket Number</th>
                  <th className="col-pnr">PNR</th>
                </tr>
              </thead>
              <tbody>
                {booking.passengers.map((pax, idx) => (
                  <tr key={pax.id}>
                    <td className="col-no">{idx + 1}</td>
                    <td className="col-name">
                      <div className="pax-name">
                        <C value={`${pax.title || 'MR'}. ${pax.name}`} copyValue={pax.name} placeholder="NAMA PENUMPANG" />
                      </div>
                      <span className="pax-type">{pax.type}</span>
                      <div className="pax-sub">
                        <C value={pax.dob ? formatDateSlash(pax.dob) : ''} placeholder="—" className="cf-inline" /> &nbsp;|&nbsp;
                        <C value={pax.passport} placeholder="—" className="cf-inline" /> &nbsp;|&nbsp;
                        <C value={pax.passportExpiry ? formatDateSlash(pax.passportExpiry) : ''} placeholder="—" className="cf-inline" />
                      </div>
                    </td>
                    <td className="col-eticket" style={{ textAlign: 'center' }}>
                      <strong>
                        <E value={pax.eTicketNumber} onChange={v => uPax(pax.id, 'eTicketNumber', v)} placeholder="______" />
                      </strong>
                    </td>
                    <td className="col-pnr" style={{ textAlign: 'center' }}>
                      <strong>
                        <E value={pax.pnr} onChange={v => uPax(pax.id, 'pnr', v)} placeholder="______" />
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== SUMMARY ===== */}
          {(showKeterangan || showHarga) && (
            <div className="summary-section">
              {showKeterangan && (
                <div className="summary-notes">
                  <h4><i className="fa-solid fa-clipboard-list" style={{ marginRight: 4 }}></i> Keterangan:</h4>
                  <ul>
                    <li>Total Penumpang: <strong>{booking.passengers.length} Pax</strong></li>
                    <li>Rute: {booking.flight.routeFrom} ({booking.flight.routeFromDetail}) → {booking.flight.routeTo} ({booking.flight.routeToDetail})</li>
                    <li>Maskapai: {booking.flight.flightNumber}</li>
                    {booking.flight.departureDate && (
                      <li>Tanggal Terbang: {formatDateSlash(booking.flight.departureDate)} {booking.flight.departureTime && `(Dep ${booking.flight.departureTime})`}</li>
                    )}
                    {booking.notes && <li>{booking.notes}</li>}
                  </ul>
                </div>
              )}
              {showHarga && (
                <div className="summary-totals">
                  <div className="total-row">
                    <span className="label">Price Per Pax</span>
                    <span className="value">Rp <EC value={booking.pricePerPax} onChange={v => u('pricePerPax', v)} /></span>
                  </div>
                  <div className="total-row">
                    <span className="label">Subtotal ({booking.passengers.length} Pax)</span>
                    <span className="value">Rp {formatRupiah(subtotal)}</span>
                  </div>
                  <div className="total-row discount">
                    <span className="label">Diskon</span>
                    <span className="value">- Rp <EC value={booking.discount} onChange={v => u('discount', v)} /></span>
                  </div>
                  <div className="total-row grand-total">
                    <span className="label">GRAND TOTAL</span>
                    <span className="value">Rp {formatRupiah(grandTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TERBILANG */}
          {showHarga && (
            <div className="terbilang-box">
              <div className="label">Terbilang:</div>
              <div className="text"># {terbilang(grandTotal)} #</div>
            </div>
          )}

          {/* PAYMENT */}
          <div className="payment-section">
            <h4><i className="fa-solid fa-credit-card" style={{ marginRight: 4 }}></i> Informasi Pembayaran</h4>
            <div className="bank-info">
              <div className="bank-item">
                <div className="bank-name"><E value={booking.payment.bankName} onChange={v => uPay('bankName', v)} /></div>
                <div className="bank-detail">a.n. <E value={booking.payment.accountName} onChange={v => uPay('accountName', v)} /></div>
                <div className="account-number"><E value={booking.payment.accountNumber} onChange={v => uPay('accountNumber', v)} /></div>
              </div>
            </div>
          </div>

          {/* TERMS */}
          <div className="terms-section">
            <h4>Syarat &amp; Ketentuan</h4>
            <p>
              1. Pembayaran dilakukan paling lambat pada tanggal jatuh tempo. &nbsp;
              2. Tiket yang sudah dibeli tidak dapat dibatalkan (non-refundable) kecuali sesuai kebijakan maskapai. &nbsp;
              3. Perubahan jadwal/reschedule dikenakan biaya sesuai ketentuan maskapai. &nbsp;
              4. Mohon sertakan nomor invoice pada saat melakukan pembayaran.
            </p>
          </div>

          {/* SIGNATURE */}
          <div className="signature-section">
            <div className="sig-box">
              <div className="sig-title">Hormat Kami,</div>
              <div className="sig-image" style={{ position: 'relative' }}>
                {(booking.status === 'confirmed' || booking.status === 'completed') && globalSignature && (
                  <img src={globalSignature} alt="TTD" style={{ width: 120, height: 'auto' }} />
                )}
                {(booking.status === 'confirmed' || booking.status === 'completed') && globalLogo && (
                  <img src={globalLogo} alt="Stempel" className="stamp-overlay"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
              <div className="sig-name">{booking.company.name}</div>
              <div className="sig-position">Direktur</div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="invoice-footer">
            <div>
              <strong>{booking.company.name}</strong>
            </div>
            <div className="footer-right">
              <i className="fa-solid fa-phone"></i> {booking.company.phone} &nbsp;|&nbsp;
              <i className="fa-solid fa-envelope"></i> {booking.company.email}<br />
              <i className="fa-solid fa-globe"></i>{' '}
              <a href={`https://${booking.company.website}`}>{booking.company.website}</a>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Loading */}
      {exporting && (
        <div className="pdf-overlay">
          <div className="pdf-box">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>Generating PDF...</p>
          </div>
        </div>
      )}
    </div>
  );
}
