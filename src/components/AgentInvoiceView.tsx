// ============================================
// AGENT INVOICE VIEW
// Read-only invoice + Edit mode (form) for pending bookings
// Invoice = full read-only view (same template as admin)
// Edit = same form as booking baru, pre-filled with current data
// Only pending bookings can be edited
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { Booking, Passenger } from '../types/booking';
import { createEmptyPassenger } from '../types/booking';
import { formatRupiah } from '../utils/formatCurrency';
import { terbilang } from '../utils/terbilang';
import { formatDateSlash } from '../utils/formatDate';
import { exportToPDF } from '../utils/exportPdf';
import { searchAirports, getAirportByCode, type Airport } from '../data/airports';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import DateInput from './DateInput';
import './DateInput.css';
import '../components/InvoicePreview.css';
import './AdminInvoiceView.css';

const PAX_TYPE_OPTIONS = [
  { value: 'ADT', label: 'ADT - Dewasa' },
  { value: 'CHD', label: 'CHD - Anak-anak' },
  { value: 'INF', label: 'INF - Bayi' },
] as const;

const TITLE_BY_TYPE = {
  ADT: [{ value: 'MR', label: 'MR' }, { value: 'MRS', label: 'MRS' }, { value: 'MS', label: 'MS' }],
  CHD: [{ value: 'MSTR', label: 'MSTR' }, { value: 'MISS', label: 'MISS' }],
  INF: [{ value: 'MSTR', label: 'MSTR' }, { value: 'MISS', label: 'MISS' }],
} as const;

// ===== ZOOM CONTROLS COMPONENT =====
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="invoice-zoom-controls">
      <button onClick={() => zoomIn()} title="Zoom In">
        <i className="fa-solid fa-magnifying-glass-plus"></i>
      </button>
      <button onClick={() => resetTransform()} title="Reset">
        <i className="fa-solid fa-expand"></i>
      </button>
      <button onClick={() => zoomOut()} title="Zoom Out">
        <i className="fa-solid fa-magnifying-glass-minus"></i>
      </button>
    </div>
  );
}

// ===== INVOICE CONTENT (shared between mobile zoom + desktop) =====
function InvoiceContent({ booking, globalLogo, globalSignature, showKeterangan, showHarga, subtotal, grandTotal, pStatus }: {
  booking: Booking;
  globalLogo: string;
  globalSignature: string;
  showKeterangan: boolean;
  showHarga: boolean;
  subtotal: number;
  grandTotal: number;
  pStatus: { icon: string; text: string; color: string };
}) {
  return (
    <>
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
            <h1>{booking.company.name}</h1>
            <p><i className="fa-solid fa-phone"></i> {booking.company.phone}</p>
            <p><i className="fa-solid fa-envelope"></i> {booking.company.email}</p>
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
          <h3>{booking.billTo.name || '—'}</h3>
          <p>
            Telp: {booking.billTo.phone || '—'}<br />
            Email: {booking.billTo.email || '—'}
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
            <span className="value meta-readonly">{booking.invoice.dueDate ? formatDateSlash(booking.invoice.dueDate) : '—'}</span>
          </div>
          <div className="meta-row">
            <span className="label">No. PO</span>
            <span className="value meta-readonly">{booking.invoice.poNumber || '—'}</span>
          </div>
          <div className="meta-row">
            <span className="label">Status</span>
            <span className="value">
              <span style={{ color: pStatus.color, fontWeight: 700 }}>
                <i className={`fa-solid ${pStatus.icon}`}></i> {pStatus.text}
              </span>
              {booking.invoice.statusNote && <span> {booking.invoice.statusNote}</span>}
            </span>
          </div>
        </div>
      </div>

      {/* FLIGHT INFO BAR */}
      <div className="flight-info-bar">
        <div className="fi-item"><span className="fi-label">Flight</span><span className="fi-value">{booking.flight.flightNumber || '—'}</span></div>
        <div className="fi-item"><span className="fi-label">Route</span><span className="fi-value">{booking.flight.routeFrom || '___'} → {booking.flight.routeTo || '___'}</span></div>
        <div className="fi-item"><span className="fi-label">Departure Date</span><span className="fi-value">{booking.flight.departureDate ? formatDateSlash(booking.flight.departureDate) : '—'}</span></div>
        <div className="fi-item"><span className="fi-label">Time</span><span className="fi-value">{booking.flight.departureTime || '--:--'}</span></div>
        <div className="fi-item"><span className="fi-label">Total Pax</span><span className="fi-value fi-pax">{booking.passengers.length}</span></div>
      </div>

      {/* TICKET TABLE */}
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
                  <div className="pax-name">{`${pax.title || 'MR'}. ${pax.name}`}</div>
                  <span className="pax-type">{pax.type}</span>
                  <div className="pax-sub">
                    {pax.dob ? formatDateSlash(pax.dob) : '—'} &nbsp;|&nbsp;
                    {pax.passport || '—'} &nbsp;|&nbsp;
                    {pax.passportExpiry ? formatDateSlash(pax.passportExpiry) : '—'}
                  </div>
                </td>
                <td className="col-eticket" style={{ textAlign: 'center' }}>
                  <strong>{pax.eTicketNumber || '—'}</strong>
                </td>
                <td className="col-pnr" style={{ textAlign: 'center' }}>
                  <strong>{pax.pnr || '—'}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
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
              <div className="total-row"><span className="label">Price Per Pax</span><span className="value">Rp {formatRupiah(booking.pricePerPax)}</span></div>
              <div className="total-row"><span className="label">Subtotal ({booking.passengers.length} Pax)</span><span className="value">Rp {formatRupiah(subtotal)}</span></div>
              <div className="total-row discount"><span className="label">Diskon</span><span className="value">- Rp {formatRupiah(booking.discount)}</span></div>
              <div className="total-row grand-total"><span className="label">GRAND TOTAL</span><span className="value">Rp {formatRupiah(grandTotal)}</span></div>
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
            <div className="bank-name">{booking.payment.bankName}</div>
            <div className="bank-detail">a.n. {booking.payment.accountName}</div>
            <div className="account-number">{booking.payment.accountNumber}</div>
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
        <div><strong>{booking.company.name}</strong></div>
        <div className="footer-right">
          <i className="fa-solid fa-phone"></i> {booking.company.phone} &nbsp;|&nbsp;
          <i className="fa-solid fa-envelope"></i> {booking.company.email}<br />
          <i className="fa-solid fa-globe"></i>{' '}
          <a href={`https://${booking.company.website}`}>{booking.company.website}</a>
        </div>
      </div>
    </>
  );
}

// ===== MAIN COMPONENT =====
interface Props { bookingId: string; onBack: () => void; }

export default function AgentInvoiceView({ bookingId, onBack }: Props) {
  const { bookings, updateBooking, companySettings } = useApp();
  const [booking, setBooking] = useState<Booking>(() => bookings.find(b => b.id === bookingId)!);
  const [exporting, setExporting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);

  // Edit-mode dropdowns
  const [openTypeDD, setOpenTypeDD] = useState<string | null>(null);
  const [openTitleDD, setOpenTitleDD] = useState<string | null>(null);
  const typeDDRef = useRef<HTMLDivElement>(null);
  const titleDDRef = useRef<HTMLDivElement>(null);

  // Edit-mode airport autocomplete
  const [acField, setAcField] = useState<'from' | 'to' | null>(null);
  const [acResults, setAcResults] = useState<Airport[]>([]);
  const [acSearchText, setAcSearchText] = useState('');
  const acRef = useRef<HTMLDivElement>(null);

  // Edit-mode import passengers
  const [showEditImport, setShowEditImport] = useState(false);
  const [editImportInvNum, setEditImportInvNum] = useState('');
  const [editImportFound, setEditImportFound] = useState<Booking | null>(null);
  const [editImportError, setEditImportError] = useState('');

  // Listen for resize to toggle mobile mode
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close edit-mode dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeDDRef.current && !typeDDRef.current.contains(e.target as Node)) setOpenTypeDD(null);
      if (titleDDRef.current && !titleDDRef.current.contains(e.target as Node)) setOpenTitleDD(null);
      if (acRef.current && !acRef.current.contains(e.target as Node)) { setAcField(null); setAcResults([]); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Warn before accidental reload when editing
  useEffect(() => {
    if (!editMode) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editMode]);

  // Airport display helper
  const airportDisplay = (code: string, detail: string) => {
    if (!code) return '';
    return detail ? `${code} — ${detail}` : code;
  };

  // Time picker helper
  const parseTime24 = (t: string) => {
    const [hh, mm] = (t || '00:00').split(':').map(Number);
    return { hour: String(hh).padStart(2, '0'), minute: String(mm || 0).padStart(2, '0') };
  };

  // Derive show/hide from booking (admin controls this)
  const showKeterangan = !booking?.hideKeterangan;
  const showHarga = !booking?.hideHarga;

  // Sync booking from context (initial load + realtime)
  useEffect(() => {
    const latest = bookings.find(b => b.id === bookingId);
    if (latest) {
      setBooking(latest); // eslint-disable-line react-hooks/set-state-in-effect
      // If status changed away from pending while editing, cancel edit
      if (latest.status !== 'pending' && editMode) {
        setEditMode(false);
        setEditForm(null);
      }
    }
  }, [bookings, bookingId, editMode]);

  const isPending = booking?.status === 'pending';

  // Global logo & TTD from company settings
  const globalLogo = companySettings?.logoUrl || '';
  const globalSignature = companySettings?.signatureUrl || '';

  // Calculations
  const subtotal = (booking?.pricePerPax || 0) * (booking?.passengers.length || 0);
  const grandTotal = subtotal - (booking?.discount || 0);

  // Status helpers
  const statusLabel: Record<string, string> = {
    pending: 'Pending', confirmed: 'Dikonfirmasi', completed: 'Selesai', cancelled: 'Dibatalkan',
  };
  const statusIcon: Record<string, string> = {
    pending: 'fa-clock', confirmed: 'fa-plane', completed: 'fa-circle-check', cancelled: 'fa-circle-xmark',
  };
  const statusColor: Record<string, string> = {
    pending: '#FDCB6E', confirmed: '#2E86AB', completed: '#00B894', cancelled: '#D63031',
  };
  const payStatusLabel: Record<string, { icon: string; text: string; color: string }> = {
    'belum-lunas': { icon: 'fa-circle', text: 'Belum Lunas', color: '#D63031' },
    'lunas': { icon: 'fa-circle-check', text: 'Lunas', color: '#00B894' },
    'dp': { icon: 'fa-circle-half-stroke', text: 'DP', color: '#D4A843' },
  };

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

  // ===== EDIT MODE HANDLERS =====
  const startEdit = () => {
    setEditForm(JSON.parse(JSON.stringify(booking))); // deep clone
    setEditMode(true);
    setOpenTypeDD(null); setOpenTitleDD(null);
    setAcField(null); setAcResults([]); setAcSearchText('');
    setShowEditImport(false); setEditImportInvNum(''); setEditImportFound(null); setEditImportError('');
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditForm(null);
    setOpenTypeDD(null); setOpenTitleDD(null);
    setAcField(null); setShowEditImport(false);
  };

  const saveEdit = async () => {
    if (!editForm) return;
    if (!editForm.billTo.name.trim()) { alert('Nama pelanggan wajib diisi!'); return; }
    if (!editForm.flight.flightNumber.trim()) { alert('Flight number wajib diisi!'); return; }
    if (!editForm.passengers[0]?.name.trim()) { alert('Minimal 1 penumpang harus diisi!'); return; }

    setSaving(true);
    try {
      const updated = { ...editForm, updatedAt: new Date().toISOString() };
      await updateBooking(updated);
      setBooking(updated);
      setEditMode(false);
      setEditForm(null);
    } catch (err) {
      alert('Gagal menyimpan: ' + (err as Error).message);
    }
    setSaving(false);
  };

  // Edit form helpers
  const uf = useCallback((field: string, value: string) => {
    setEditForm(p => p ? { ...p, flight: { ...p.flight, [field]: value } } : p);
  }, []);
  const ub = useCallback((field: string, value: string) => {
    setEditForm(p => p ? { ...p, billTo: { ...p.billTo, [field]: value } } : p);
  }, []);
  const up = useCallback((id: string, field: keyof Passenger, value: string) => {
    setEditForm(p => {
      if (!p) return p;
      return {
        ...p,
        passengers: p.passengers.map(x => {
          if (x.id !== id) return x;
          const updated = { ...x, [field]: value };
          if (field === 'type') {
            const validTitles = TITLE_BY_TYPE[value as 'ADT' | 'CHD' | 'INF'].map(t => t.value);
            if (!validTitles.includes(updated.title)) {
              updated.title = validTitles[0] as typeof updated.title;
            }
          }
          return updated;
        }),
      };
    });
  }, []);
  const addEditPax = useCallback(() => {
    setEditForm(p => p ? { ...p, passengers: [...p.passengers, createEmptyPassenger()] } : p);
  }, []);
  const removeEditPax = useCallback((id: string) => {
    setEditForm(p => {
      if (!p || p.passengers.length <= 1) return p;
      return { ...p, passengers: p.passengers.filter(x => x.id !== id) };
    });
  }, []);

  const editApplyQuickRoute = (fromCode: string, toCode: string) => {
    const fromAirport = getAirportByCode(fromCode);
    const toAirport = getAirportByCode(toCode);
    setEditForm(p => p ? {
      ...p,
      flight: {
        ...p.flight,
        routeFrom: fromCode,
        routeTo: toCode,
        routeFromDetail: fromAirport ? `${fromAirport.city} (${fromAirport.name})` : '',
        routeToDetail: toAirport ? `${toAirport.city} (${toAirport.name})` : '',
      },
    } : p);
  };
  const handleEditAirportInput = (field: 'from' | 'to', value: string) => {
    setAcSearchText(value);
    if (value.length >= 1) {
      setAcField(field);
      setAcResults(searchAirports(value));
    } else {
      uf(field === 'from' ? 'routeFrom' : 'routeTo', '');
      uf(field === 'from' ? 'routeFromDetail' : 'routeToDetail', '');
      setAcField(null); setAcResults([]);
    }
  };
  const selectEditAirport = (field: 'from' | 'to', airport: Airport) => {
    uf(field === 'from' ? 'routeFrom' : 'routeTo', airport.code);
    uf(field === 'from' ? 'routeFromDetail' : 'routeToDetail', `${airport.city} (${airport.name})`);
    setAcField(null); setAcResults([]); setAcSearchText('');
  };
  const handleEditAirportFocus = (field: 'from' | 'to') => {
    if (!editForm) return;
    const code = field === 'from' ? editForm.flight.routeFrom : editForm.flight.routeTo;
    setAcField(field); setAcSearchText(code || '');
    if (code) setAcResults(searchAirports(code));
  };
  const handleEditAirportBlur = () => { setTimeout(() => setAcSearchText(''), 200); };
  const setEditTimePart = (part: 'hour' | 'minute', val: string) => {
    if (!editForm) return;
    const cur = parseTime24(editForm.flight.departureTime);
    const updated = { ...cur, [part]: val };
    uf('departureTime', `${updated.hour}:${updated.minute}`);
  };
  const searchEditImportInvoice = useCallback(() => {
    if (!editImportInvNum.trim()) { setEditImportError('Masukkan nomor invoice'); setEditImportFound(null); return; }
    const q = editImportInvNum.trim().toUpperCase();
    const found = bookings.find(b => b.invoice.invoiceNumber.toUpperCase() === q);
    if (found) { setEditImportFound(found); setEditImportError(''); }
    else { setEditImportFound(null); setEditImportError('Invoice tidak ditemukan'); }
  }, [editImportInvNum, bookings]);
  const importEditPassengers = useCallback(() => {
    if (!editImportFound) return;
    const cloned = editImportFound.passengers.map(p => ({ ...p, id: crypto.randomUUID(), eTicketNumber: '', pnr: '' }));
    setEditForm(prev => {
      if (!prev) return prev;
      const hasOnlyEmpty = prev.passengers.length === 1 && !prev.passengers[0].name.trim();
      return { ...prev, passengers: hasOnlyEmpty ? cloned : [...prev.passengers, ...cloned] };
    });
    setEditImportInvNum(''); setEditImportFound(null); setEditImportError('');
  }, [editImportFound]);

  if (!booking) return <div className="panel-container"><p>Booking tidak ditemukan</p></div>;

  const pStatus = payStatusLabel[booking.invoice.status] || payStatusLabel['belum-lunas'];

  // ===== EDIT MODE — Same form as booking baru =====
  if (editMode && editForm) {
    return (
      <div className="aiv-container">
        <div className="aiv-actionbar">
          <button className="aiv-back" onClick={cancelEdit}>
            <i className="fa-solid fa-arrow-left"></i> Batal
          </button>
          <div className="aiv-actions-center">
            <span className="agent-edit-title">
              <i className="fa-solid fa-pen-to-square"></i> Edit Booking
            </span>
          </div>
          <div className="aiv-actions-right">
            <button className="aiv-btn primary" onClick={saveEdit} disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Menyimpan...</> :
                <><i className="fa-solid fa-check"></i> Simpan Perubahan</>}
            </button>
          </div>
        </div>

        <div className="agent-edit-form-wrap">
          <div className="booking-form">
            <div className="bf-top">
            {/* ===== INFO PELANGGAN ===== */}
            <div className="form-section">
              <h3><span className="si"><i className="fa-solid fa-user"></i></span> Informasi Pelanggan</h3>
              <div className="fg">
                <div className="fi full">
                  <label>Nama Pelanggan / Perusahaan</label>
                  <input type="text" placeholder="LINDA HASTUTI" value={editForm.billTo.name}
                    onChange={e => ub('name', e.target.value.toUpperCase())} />
                </div>
                <div className="fi full">
                  <label>Telepon</label>
                  <input type="text" placeholder="+62 xxx-xxxx-xxxx" value={editForm.billTo.phone}
                    onChange={e => ub('phone', e.target.value)} />
                </div>
                <div className="fi full">
                  <label>Email</label>
                  <input type="email" placeholder="email@example.com" value={editForm.billTo.email}
                    onChange={e => ub('email', e.target.value)} />
                </div>
              </div>

              {/* ===== CATATAN (inline) ===== */}
              <div className="notes-inline">
                <label><i className="fa-solid fa-note-sticky"></i> Catatan</label>
                <textarea placeholder="Catatan tambahan (opsional)..." value={editForm.notes}
                  onChange={e => setEditForm(p => p ? { ...p, notes: e.target.value } : p)} />
              </div>
            </div>

            {/* ===== INFO PENERBANGAN ===== */}
            <div className="form-section">
              <h3><span className="si"><i className="fa-solid fa-plane"></i></span> Informasi Penerbangan</h3>
              <div className="quick-actions">
                <button onClick={() => editApplyQuickRoute('JED', 'CGK')}>
                  <i className="fa-solid fa-bolt"></i> JED → CGK
                </button>
                <button onClick={() => editApplyQuickRoute('CGK', 'JED')}>
                  <i className="fa-solid fa-bolt"></i> CGK → JED
                </button>
                <button onClick={() => editApplyQuickRoute('MED', 'CGK')}>
                  <i className="fa-solid fa-bolt"></i> MED → CGK
                </button>
                <button onClick={() => uf('flightNumber', 'SV826')}><i className="fa-solid fa-bolt"></i> SV826</button>
                <button onClick={() => uf('flightNumber', 'SV818')}><i className="fa-solid fa-bolt"></i> SV818</button>
              </div>
              <div className="fg">
                <div className="fi">
                  <label>Flight Number</label>
                  <input type="text" placeholder="SV826" value={editForm.flight.flightNumber}
                    onChange={e => uf('flightNumber', e.target.value.toUpperCase())} />
                </div>
                <div className="fi">
                  <label>Tanggal Berangkat</label>
                  <DateInput value={editForm.flight.departureDate}
                    onChange={v => uf('departureDate', v)} />
                </div>
                <div className="fi full ac-wrap" ref={acField === 'from' ? acRef : undefined}>
                  <label>Bandara Asal</label>
                  <input type="text" placeholder="Ketik kode / nama kota... contoh: CGK, Jakarta, Soekarno"
                    value={acField === 'from' ? acSearchText : airportDisplay(editForm.flight.routeFrom, editForm.flight.routeFromDetail)}
                    onChange={e => handleEditAirportInput('from', e.target.value)}
                    onFocus={() => handleEditAirportFocus('from')}
                    onBlur={handleEditAirportBlur} />
                  {acField === 'from' && acResults.length > 0 && (
                    <div className="ac-dropdown">
                      {acResults.map(a => (
                        <div key={a.code} className="ac-item" onClick={() => selectEditAirport('from', a)}>
                          <span className="ac-code">{a.code}</span>
                          <span className="ac-info">{a.city} — {a.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="fi full ac-wrap" ref={acField === 'to' ? acRef : undefined}>
                  <label>Bandara Tujuan</label>
                  <input type="text" placeholder="Ketik kode / nama kota... contoh: KNO, Medan, Kualanamu"
                    value={acField === 'to' ? acSearchText : airportDisplay(editForm.flight.routeTo, editForm.flight.routeToDetail)}
                    onChange={e => handleEditAirportInput('to', e.target.value)}
                    onFocus={() => handleEditAirportFocus('to')}
                    onBlur={handleEditAirportBlur} />
                  {acField === 'to' && acResults.length > 0 && (
                    <div className="ac-dropdown">
                      {acResults.map(a => (
                        <div key={a.code} className="ac-item" onClick={() => selectEditAirport('to', a)}>
                          <span className="ac-code">{a.code}</span>
                          <span className="ac-info">{a.city} — {a.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="fi full">
                  <label>Jam Berangkat</label>
                  {(() => {
                    const t = parseTime24(editForm.flight.departureTime);
                    return (
                      <div className="time-picker">
                        <select value={t.hour} onChange={e => setEditTimePart('hour', e.target.value)}>
                          {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="time-sep">:</span>
                        <select value={t.minute} onChange={e => setEditTimePart('minute', e.target.value)}>
                          {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            </div>

            {/* ===== PENUMPANG ===== */}
            <div className="form-section">
              <h3><span className="si"><i className="fa-solid fa-users"></i></span> Penumpang ({editForm.passengers.length} pax)</h3>

              {/* Import from Invoice */}
              <div className="pax-import-toggle">
                <button className={`pax-import-btn ${showEditImport ? 'active' : ''}`} type="button" onClick={() => { setShowEditImport(!showEditImport); setEditImportFound(null); setEditImportError(''); setEditImportInvNum(''); }}>
                  <i className={`fa-solid ${showEditImport ? 'fa-chevron-up' : 'fa-file-import'}`}></i>
                  {showEditImport ? 'Tutup Import' : 'Import dari Invoice'}
                </button>
              </div>

              {showEditImport && (
                <div className="pax-import-box">
                  <div className="pax-import-row">
                    <div className="pax-import-input-wrap">
                      <i className="fa-solid fa-magnifying-glass"></i>
                      <input
                        type="text"
                        placeholder="Ketik nomor invoice, cth: INV/20260227/001"
                        value={editImportInvNum}
                        onChange={e => { setEditImportInvNum(e.target.value.toUpperCase()); setEditImportError(''); setEditImportFound(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') searchEditImportInvoice(); }}
                      />
                    </div>
                    <button className="pax-import-search" type="button" onClick={searchEditImportInvoice}>
                      <i className="fa-solid fa-search"></i> Cari
                    </button>
                  </div>

                  {editImportError && (
                    <div className="pax-import-error">
                      <i className="fa-solid fa-circle-exclamation"></i> {editImportError}
                    </div>
                  )}

                  {editImportFound && (
                    <div className="pax-import-preview">
                      <div className="pax-import-info">
                        <div className="pax-import-inv">
                          <i className="fa-solid fa-file-invoice"></i> {editImportFound.invoice.invoiceNumber}
                        </div>
                        <div className="pax-import-meta">
                          {editImportFound.billTo.name} &bull; {editImportFound.flight.routeFrom} → {editImportFound.flight.routeTo} &bull; {editImportFound.passengers.length} pax
                        </div>
                      </div>
                      <div className="pax-import-list">
                        {editImportFound.passengers.map((p, i) => (
                          <div key={p.id} className="pax-import-item">
                            <span className="pax-import-num">{i + 1}</span>
                            <span className="pax-import-name">{p.title}. {p.name}</span>
                            <span className="pax-import-type">{p.type}</span>
                          </div>
                        ))}
                      </div>
                      <button className="pax-import-confirm" type="button" onClick={importEditPassengers}>
                        <i className="fa-solid fa-download"></i> Import {editImportFound.passengers.length} Penumpang
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Table header */}
              <div className="pax-table-head">
                <span className="pth-ico"></span>
                <span className="pth-title">Title</span>
                <span className="pth-name">Nama Lengkap</span>
                <span className="pth-type">Tipe</span>
                <span className="pth-cell">Tgl Lahir</span>
                <span className="pth-cell">No. Paspor</span>
                <span className="pth-cell">Expired</span>
                <span className="pth-act"></span>
              </div>

              {/* Rows */}
              {editForm.passengers.map((pax, idx) => (
                <div key={pax.id} className="pax-row">
                  <span className="pax-ico" title={`Penumpang ${idx + 1}`}>
                    {idx + 1}
                  </span>
                  <div className="pax-dd pax-dd-title" ref={openTitleDD === pax.id ? titleDDRef : undefined}>
                    <div
                      onClick={() => setOpenTitleDD(openTitleDD === pax.id ? null : pax.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 8px', borderRadius: 7, cursor: 'pointer',
                        border: '1.5px solid #DFE6E9', background: '#fff',
                        fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#2D3436',
                      }}>
                      <span>{pax.title || 'MR'}</span>
                      <i className="fa-solid fa-chevron-down" style={{ fontSize: 8, color: '#636E72' }}></i>
                    </div>
                    {openTitleDD === pax.id && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                        background: '#fff', border: '1.5px solid #DFE6E9', borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden',
                      }}>
                        {TITLE_BY_TYPE[pax.type].map(opt => (
                          <div key={opt.value}
                            onClick={() => { up(pax.id, 'title', opt.value); setOpenTitleDD(null); }}
                            style={{
                              padding: '8px 10px', cursor: 'pointer', fontSize: 12,
                              fontFamily: 'Inter, sans-serif', fontWeight: 600,
                              background: pax.title === opt.value ? '#F0F5FA' : '#fff',
                              color: pax.title === opt.value ? '#1B3A5C' : '#2D3436',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F0F5FA')}
                            onMouseLeave={e => (e.currentTarget.style.background = pax.title === opt.value ? '#F0F5FA' : '#fff')}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pax-cell pax-name">
                    <input type="text" placeholder="Nama sesuai paspor / KTP" value={pax.name}
                      onChange={e => up(pax.id, 'name', e.target.value.toUpperCase())} />
                  </div>
                  <div className="pax-dd pax-dd-type" ref={openTypeDD === pax.id ? typeDDRef : undefined}>
                    <div
                      onClick={() => setOpenTypeDD(openTypeDD === pax.id ? null : pax.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
                        border: '1.5px solid #DFE6E9', background: '#fff',
                        fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#2D3436',
                      }}>
                      <span>{PAX_TYPE_OPTIONS.find(o => o.value === pax.type)?.label || pax.type}</span>
                      <i className="fa-solid fa-chevron-down" style={{ fontSize: 9, color: '#636E72' }}></i>
                    </div>
                    {openTypeDD === pax.id && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                        background: '#fff', border: '1.5px solid #DFE6E9', borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden',
                      }}>
                        {PAX_TYPE_OPTIONS.map(opt => (
                          <div key={opt.value}
                            onClick={() => { up(pax.id, 'type', opt.value); setOpenTypeDD(null); }}
                            style={{
                              padding: '9px 12px', cursor: 'pointer', fontSize: 12,
                              fontFamily: 'Inter, sans-serif',
                              background: pax.type === opt.value ? '#F0F5FA' : '#fff',
                              color: pax.type === opt.value ? '#1B3A5C' : '#2D3436',
                              fontWeight: pax.type === opt.value ? 600 : 400,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F0F5FA')}
                            onMouseLeave={e => (e.currentTarget.style.background = pax.type === opt.value ? '#F0F5FA' : '#fff')}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pax-cell" data-label="Tgl Lahir">
                    <DateInput value={pax.dob}
                      onChange={v => up(pax.id, 'dob', v)} placeholder="DD/MM/YYYY" />
                  </div>
                  <div className="pax-cell" data-label="No. Paspor">
                    <input type="text" placeholder="A12345678" value={pax.passport}
                      onChange={e => up(pax.id, 'passport', e.target.value.toUpperCase())} />
                  </div>
                  <div className="pax-cell" data-label="Expired Paspor">
                    <DateInput value={pax.passportExpiry}
                      onChange={v => up(pax.id, 'passportExpiry', v)} placeholder="DD/MM/YYYY" />
                  </div>
                  <div className="pax-act">
                    {editForm.passengers.length > 1 && (
                      <button className="btn-del" onClick={() => removeEditPax(pax.id)}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button className="btn-add-pax" onClick={addEditPax}>
                <i className="fa-solid fa-plus"></i> Tambah Penumpang
              </button>
            </div>

            <button className="btn-submit" onClick={saveEdit} disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Menyimpan...</> :
                <><i className="fa-solid fa-check"></i> Simpan Perubahan</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== READ-ONLY INVOICE VIEW =====
  return (
    <div className="aiv-container">
      {/* ===== ACTION BAR ===== */}
      <div className="aiv-actionbar">
        <button className="aiv-back" onClick={onBack}>
          <i className="fa-solid fa-arrow-left"></i> Kembali
        </button>
        <div className="aiv-actions-center">
          <span className="agent-status-badge" style={{ color: statusColor[booking.status], borderColor: statusColor[booking.status] }}>
            <i className={`fa-solid ${statusIcon[booking.status]}`}></i> {statusLabel[booking.status]}
          </span>
        </div>
        <div className="aiv-actions-right">
          {isPending && (
            <button className="aiv-btn warning" onClick={startEdit}>
              <i className="fa-solid fa-pen-to-square"></i> Edit
            </button>
          )}
          <button className="aiv-btn primary" onClick={handleExport} disabled={exporting}>
            {exporting ? <><i className="fa-solid fa-spinner fa-spin"></i> PDF...</> :
              <><i className="fa-solid fa-file-pdf"></i> Export PDF</>}
          </button>
        </div>
      </div>

      {/* ===== INVOICE PAGE (READ-ONLY) ===== */}
      {isMobile ? (
      <div className="aiv-preview-area aiv-zoom-area">
        <TransformWrapper
          initialScale={0.42}
          minScale={0.25}
          maxScale={2.5}
          centerOnInit
          centerZoomedOut
          limitToBounds={false}
          wheel={{ step: 0.08 }}
          pinch={{ step: 5 }}
        >
          <ZoomControls />
          <TransformComponent
            wrapperClass="zoom-wrapper"
            contentClass="zoom-content"
          >
            <div className="invoice-page invoice-page-zoomed" ref={invoiceRef} id="invoicePage">
              <InvoiceContent booking={booking} globalLogo={globalLogo} globalSignature={globalSignature} showKeterangan={showKeterangan} showHarga={showHarga} subtotal={subtotal} grandTotal={grandTotal} pStatus={pStatus} />
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>
      ) : (
      <div className="aiv-preview-area">
        <div className="invoice-page" ref={invoiceRef} id="invoicePage">
          <InvoiceContent booking={booking} globalLogo={globalLogo} globalSignature={globalSignature} showKeterangan={showKeterangan} showHarga={showHarga} subtotal={subtotal} grandTotal={grandTotal} pStatus={pStatus} />
        </div>
      </div>
      )}

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
