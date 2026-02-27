// ============================================
// AGENT PANEL
// Create bookings + view booking list
// Agent profile auto-filled from DB
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Booking, Passenger } from '../types/booking';
import { createNewBooking, createEmptyPassenger } from '../types/booking';
import { formatDateIndo } from '../utils/formatDate';
import { generateInvoiceNumber, generatePONumber, getTodayDate } from '../utils/generateNumbers';
import { searchAirports, getAirportByCode, type Airport } from '../data/airports';
import AgentInvoiceView from './AgentInvoiceView';
import './AgentPanel.css';

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

// Persist agent navigation + form draft
const AGENT_NAV_KEY = 'gtmg_agent_nav';
const AGENT_FORM_KEY = 'gtmg_agent_form';
const AGENT_VIEW_KEY = 'gtmg_agent_view';

export default function AgentPanel() {
  const { user, bookings, addBooking, logout, loading } = useApp();
  const agent = user?.agent;

  // Restore viewId from session (for invoice detail view)
  const [viewId, _setViewId] = useState<string | null>(() => {
    try { return sessionStorage.getItem(AGENT_VIEW_KEY) || null; } catch { return null; }
  });
  const setViewId = useCallback((id: string | null) => {
    _setViewId(id);
    if (id) sessionStorage.setItem(AGENT_VIEW_KEY, id);
    else sessionStorage.removeItem(AGENT_VIEW_KEY);
  }, []);

  // Restore tab from session (default: 'list' = Booking Saya)
  const [tab, _setTab] = useState<'new' | 'list'>(() => {
    try { return (sessionStorage.getItem(AGENT_NAV_KEY) as 'new' | 'list') || 'list'; } catch { return 'list'; }
  });
  const setTab = useCallback((t: 'new' | 'list') => {
    _setTab(t);
    sessionStorage.setItem(AGENT_NAV_KEY, t);
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const PER_PAGE = 10;

  // Import passengers from existing invoice
  const [showImport, setShowImport] = useState(false);
  const [importInvNum, setImportInvNum] = useState('');
  const [importFound, setImportFound] = useState<Booking | null>(null);
  const [importError, setImportError] = useState('');

  const searchImportInvoice = useCallback(() => {
    if (!importInvNum.trim()) { setImportError('Masukkan nomor invoice'); setImportFound(null); return; }
    const q = importInvNum.trim().toUpperCase();
    const found = bookings.find(b => b.invoice.invoiceNumber.toUpperCase() === q);
    if (found) { setImportFound(found); setImportError(''); }
    else { setImportFound(null); setImportError('Invoice tidak ditemukan'); }
  }, [importInvNum, bookings]);

  const importPassengers = useCallback(() => {
    if (!importFound) return;
    const cloned = importFound.passengers.map(p => ({
      ...p,
      id: crypto.randomUUID(),
      bookingRef: '',
      price: 0,
    }));
    setForm(prev => {
      // If there's only 1 empty passenger, replace it; otherwise append
      const hasOnlyEmpty = prev.passengers.length === 1 && !prev.passengers[0].name.trim();
      return { ...prev, passengers: hasOnlyEmpty ? cloned : [...prev.passengers, ...cloned] };
    });
    setImportInvNum('');
    setImportFound(null);
    setImportError('');
  }, [importFound]);
  const [openTypeDD, setOpenTypeDD] = useState<string | null>(null);
  const [openTitleDD, setOpenTitleDD] = useState<string | null>(null);
  const typeDDRef = useRef<HTMLDivElement>(null);
  const titleDDRef = useRef<HTMLDivElement>(null);

  // Airport autocomplete
  const [acField, setAcField] = useState<'from' | 'to' | null>(null);
  const [acResults, setAcResults] = useState<Airport[]>([]);
  const [acSearchText, setAcSearchText] = useState('');
  const acRef = useRef<HTMLDivElement>(null);

  // Build display string: "CGK — Jakarta (Soekarno-Hatta Intl)"
  const airportDisplay = (code: string, detail: string) => {
    if (!code) return '';
    return detail ? `${code} — ${detail}` : code;
  };

  const handleAirportInput = (field: 'from' | 'to', value: string) => {
    setAcSearchText(value);
    if (value.length >= 1) {
      setAcField(field);
      setAcResults(searchAirports(value));
    } else {
      // Clear the stored values when user empties the field
      const codeField = field === 'from' ? 'routeFrom' : 'routeTo';
      const detailField = field === 'from' ? 'routeFromDetail' : 'routeToDetail';
      updateFlight(codeField, '');
      updateFlight(detailField, '');
      setAcField(null);
      setAcResults([]);
    }
  };

  const selectAirport = (field: 'from' | 'to', airport: Airport) => {
    const detailField = field === 'from' ? 'routeFromDetail' : 'routeToDetail';
    const codeField = field === 'from' ? 'routeFrom' : 'routeTo';
    updateFlight(codeField, airport.code);
    updateFlight(detailField, `${airport.city} (${airport.name})`);
    setAcField(null);
    setAcResults([]);
    setAcSearchText('');
  };

  const handleAirportFocus = (field: 'from' | 'to') => {
    const code = field === 'from' ? form.flight.routeFrom : form.flight.routeTo;
    setAcField(field);
    setAcSearchText(code || '');
    if (code) setAcResults(searchAirports(code));
  };

  const handleAirportBlur = () => {
    // Small delay to allow click on dropdown item
    setTimeout(() => {
      setAcSearchText('');
    }, 200);
  };

  // Time picker helpers
  const parseTime12 = (t: string) => {
    const [hh, mm] = (t || '00:00').split(':').map(Number);
    const period = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    return { hour: String(h12).padStart(2, '0'), minute: String(mm || 0).padStart(2, '0'), period };
  };

  const setTimePart = (part: 'hour' | 'minute' | 'period', val: string) => {
    const cur = parseTime12(form.flight.departureTime);
    const updated = { ...cur, [part]: val };
    let h24 = parseInt(updated.hour);
    if (updated.period === 'AM' && h24 === 12) h24 = 0;
    else if (updated.period === 'PM' && h24 !== 12) h24 += 12;
    const time24 = `${String(h24).padStart(2, '0')}:${updated.minute}`;
    updateFlight('departureTime', time24);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeDDRef.current && !typeDDRef.current.contains(e.target as Node)) setOpenTypeDD(null);
      if (titleDDRef.current && !titleDDRef.current.contains(e.target as Node)) setOpenTitleDD(null);
      if (acRef.current && !acRef.current.contains(e.target as Node)) { setAcField(null); setAcResults([]); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Pre-fill billTo from agent profile
  const makeNewForm = useCallback((): Booking => {
    const form = createNewBooking();
    if (agent) {
      form.agentId = agent.id;
      form.billTo = {
        name: agent.companyName || agent.name,
        phone: agent.phone,
        email: agent.email,
      };
    }
    return form;
  }, [agent]);

  // Restore form draft from session
  const [form, setForm] = useState<Booking>(() => {
    try {
      const raw = sessionStorage.getItem(AGENT_FORM_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return makeNewForm();
  });

  // Auto-save form draft to sessionStorage
  const formTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (formTimer.current) clearTimeout(formTimer.current);
    formTimer.current = setTimeout(() => {
      sessionStorage.setItem(AGENT_FORM_KEY, JSON.stringify(form));
    }, 300);
    return () => { if (formTimer.current) clearTimeout(formTimer.current); };
  }, [form]);

  // Warn before accidental reload only on Booking Baru tab with data
  useEffect(() => {
    if (tab !== 'new') return;
    const hasData = form.flight.flightNumber || form.passengers[0]?.name;
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [form, tab]);
  // --- Form Helpers ---
  const updateFlight = useCallback((field: string, value: string) => {
    setForm(p => ({ ...p, flight: { ...p.flight, [field]: value } }));
  }, []);

  const updateBillTo = useCallback((field: string, value: string) => {
    setForm(p => ({ ...p, billTo: { ...p.billTo, [field]: value } }));
  }, []);

  const updatePax = useCallback((id: string, field: keyof Passenger, value: string) => {
    setForm(p => ({
      ...p,
      passengers: p.passengers.map(x => {
        if (x.id !== id) return x;
        const updated = { ...x, [field]: value };
        // Auto-adjust title when type changes
        if (field === 'type') {
          const validTitles = TITLE_BY_TYPE[value as 'ADT' | 'CHD' | 'INF'].map(t => t.value);
          if (!validTitles.includes(updated.title)) {
            updated.title = validTitles[0] as typeof updated.title;
          }
        }
        return updated;
      }),
    }));
  }, []);

  const addPax = useCallback(() => {
    setForm(p => ({ ...p, passengers: [...p.passengers, createEmptyPassenger()] }));
  }, []);

  const removePax = useCallback((id: string) => {
    setForm(p => {
      if (p.passengers.length <= 1) return p;
      return { ...p, passengers: p.passengers.filter(x => x.id !== id) };
    });
  }, []);

  const movePax = useCallback((idx: number, dir: -1 | 1) => {
    setForm(p => {
      const arr = [...p.passengers];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return p;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...p, passengers: arr };
    });
  }, []);

  const applyQuickRoute = (fromCode: string, toCode: string) => {
    const fromAirport = getAirportByCode(fromCode);
    const toAirport = getAirportByCode(toCode);
    setForm(p => ({
      ...p,
      flight: {
        ...p.flight,
        routeFrom: fromCode,
        routeTo: toCode,
        routeFromDetail: fromAirport ? `${fromAirport.city} (${fromAirport.name})` : '',
        routeToDetail: toAirport ? `${toAirport.city} (${toAirport.name})` : '',
      },
    }));
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!form.billTo.name.trim()) { alert('Nama pelanggan wajib diisi!'); return; }
    if (!form.flight.flightNumber.trim()) { alert('Flight number wajib diisi!'); return; }
    if (!form.passengers[0]?.name.trim()) { alert('Minimal 1 penumpang harus diisi!'); return; }

    setSubmitting(true);
    try {
      // Auto-generate invoice number, PO number, and invoice date
      const [invNumber, poNumber] = await Promise.all([
        generateInvoiceNumber(),
        generatePONumber(),
      ]);

      const booking: Booking = {
        ...form,
        id: crypto.randomUUID(),
        agentId: agent?.id,
        status: 'pending',
        invoice: {
          ...form.invoice,
          invoiceNumber: invNumber,
          invoiceDate: getTodayDate(),
          poNumber: poNumber,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addBooking(booking);
      setForm(makeNewForm());
      sessionStorage.removeItem(AGENT_FORM_KEY); // Clear saved draft
      setSuccess(`Booking berhasil dibuat! ${booking.flight.routeFrom}→${booking.flight.routeTo} • ${booking.passengers.length} pax`);
      setTimeout(() => setSuccess(''), 4000);
      setTab('list');
    } catch (err) {
      alert('Gagal membuat booking: ' + (err as Error).message);
    }
    setSubmitting(false);
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Dikonfirmasi',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    };
    return map[s] || s;
  };

  return (
    <div className="panel-container">
      {/* ===== AGENT INVOICE VIEW ===== */}
      {viewId ? (
        (() => {
          const found = bookings.find(b => b.id === viewId);
          if (!found && loading) return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <div style={{ textAlign: 'center', color: '#636E72' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28, marginBottom: 12 }}></i>
                <p>Memuat invoice...</p>
              </div>
            </div>
          );
          if (!found && !loading) { setViewId(null); return null; }
          return <AgentInvoiceView bookingId={viewId} onBack={() => setViewId(null)} />;
        })()
      ) : (
      <>
      {/* Top Bar */}
      <div className="panel-topbar">
        <div className="topbar-left">
          <div className="topbar-icon agent-icon">
            <i className="fa-solid fa-headset"></i>
          </div>
        </div>
        <div className="topbar-center">
          <h2>Agent Panel</h2>
          <p>{agent ? `${agent.name} — ${agent.companyName}` : 'PT Global Teknik Multi Guna'}</p>
        </div>
        <div className="topbar-right">
          <button className="btn-logout" onClick={logout}>
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        <button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>
          <i className="fa-solid fa-plus-circle"></i> Booking Baru
        </button>
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>
          <i className="fa-solid fa-list"></i> Booking Saya
        </button>
      </div>

      {/* Stats Bar (only on Booking Saya) */}
      {tab === 'list' && (
      <div className="agent-stats">
        {[
          { key: '_total', label: 'Total Booking', accent: '#1B3A5C' },
          { key: 'pending', label: 'Pending', accent: '#B8860B' },
          { key: 'confirmed', label: 'Konfirmasi', accent: '#2E86AB' },
          { key: 'completed', label: 'Selesai', accent: '#00B894' },
          { key: 'cancelled', label: 'Batal', accent: '#D63031' },
        ].map(s => {
          const count = s.key === '_total'
            ? bookings.length
            : bookings.filter(b => b.status === s.key).length;
          const isActive = s.key === '_total'
            ? !statusFilter
            : statusFilter === s.key;
          return (
            <div
              key={s.key}
              className={`agent-stat ${isActive ? 'as-active' : ''} ${s.key === '_total' ? 'as-full' : ''}`}
              style={{ '--as-accent': s.accent } as React.CSSProperties}
              onClick={() => {
                if (s.key === '_total') { setStatusFilter(null); }
                else { setStatusFilter(prev => prev === s.key ? null : s.key); }
                setPage(1);
              }}
            >
              <span className="as-num">{count}</span>
              <span className="as-label">{s.label}</span>
            </div>
          );
        })}
      </div>
      )}

      {success && (
        <div className="success-banner">
          <i className="fa-solid fa-check-circle"></i> {success}
        </div>
      )}

      {/* Content */}
      <div className="panel-content">
        {tab === 'new' ? (
          <div className="booking-form">
            <div className="bf-top">
            {/* ===== INFO PELANGGAN ===== */}
            <div className="form-section">
              <h3><span className="si"><i className="fa-solid fa-user"></i></span> Informasi Pelanggan</h3>
              <div className="fg">
                <div className="fi full">
                  <label>Nama Pelanggan / Perusahaan</label>
                  <input type="text" placeholder="LINDA HASTUTI" value={form.billTo.name}
                    onChange={e => updateBillTo('name', e.target.value.toUpperCase())} />
                </div>
                <div className="fi full">
                  <label>Telepon</label>
                  <input type="text" placeholder="+62 xxx-xxxx-xxxx" value={form.billTo.phone}
                    onChange={e => updateBillTo('phone', e.target.value)} />
                </div>
                <div className="fi full">
                  <label>Email</label>
                  <input type="email" placeholder="email@example.com" value={form.billTo.email}
                    onChange={e => updateBillTo('email', e.target.value)} />
                </div>
              </div>

              {/* ===== CATATAN (moved here) ===== */}
              <div className="notes-inline">
                <label><i className="fa-solid fa-note-sticky"></i> Catatan</label>
                <textarea placeholder="Catatan tambahan (opsional)..." value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            {/* ===== INFO PENERBANGAN ===== */}
            <div className="form-section">
              <h3><span className="si"><i className="fa-solid fa-plane"></i></span> Informasi Penerbangan</h3>
              <div className="quick-actions">
                <button onClick={() => applyQuickRoute('JED', 'CGK')}>
                  <i className="fa-solid fa-bolt"></i> JED → CGK
                </button>
                <button onClick={() => applyQuickRoute('CGK', 'JED')}>
                  <i className="fa-solid fa-bolt"></i> CGK → JED
                </button>
                <button onClick={() => applyQuickRoute('MED', 'CGK')}>
                  <i className="fa-solid fa-bolt"></i> MED → CGK
                </button>
                <button onClick={() => updateFlight('flightNumber', 'SV826')}><i className="fa-solid fa-bolt"></i> SV826</button>
                <button onClick={() => updateFlight('flightNumber', 'SV818')}><i className="fa-solid fa-bolt"></i> SV818</button>
              </div>
              <div className="fg">
                <div className="fi">
                  <label>Flight Number</label>
                  <input type="text" placeholder="SV826" value={form.flight.flightNumber}
                    onChange={e => updateFlight('flightNumber', e.target.value.toUpperCase())} />
                </div>
                <div className="fi">
                  <label>Tanggal Berangkat</label>
                  <input type="date" value={form.flight.departureDate}
                    onChange={e => updateFlight('departureDate', e.target.value)} />
                </div>
                <div className="fi full ac-wrap" ref={acField === 'from' ? acRef : undefined}>
                  <label>Bandara Asal</label>
                  <input type="text" placeholder="Ketik kode / nama kota... contoh: CGK, Jakarta, Soekarno"
                    value={acField === 'from' ? acSearchText : airportDisplay(form.flight.routeFrom, form.flight.routeFromDetail)}
                    onChange={e => handleAirportInput('from', e.target.value)}
                    onFocus={() => handleAirportFocus('from')}
                    onBlur={handleAirportBlur} />
                  {acField === 'from' && acResults.length > 0 && (
                    <div className="ac-dropdown">
                      {acResults.map(a => (
                        <div key={a.code} className="ac-item" onClick={() => selectAirport('from', a)}>
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
                    value={acField === 'to' ? acSearchText : airportDisplay(form.flight.routeTo, form.flight.routeToDetail)}
                    onChange={e => handleAirportInput('to', e.target.value)}
                    onFocus={() => handleAirportFocus('to')}
                    onBlur={handleAirportBlur} />
                  {acField === 'to' && acResults.length > 0 && (
                    <div className="ac-dropdown">
                      {acResults.map(a => (
                        <div key={a.code} className="ac-item" onClick={() => selectAirport('to', a)}>
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
                    const t = parseTime12(form.flight.departureTime);
                    return (
                      <div className="time-picker">
                        <select value={t.hour} onChange={e => setTimePart('hour', e.target.value)}>
                          {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="time-sep">:</span>
                        <select value={t.minute} onChange={e => setTimePart('minute', e.target.value)}>
                          {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select value={t.period} onChange={e => setTimePart('period', e.target.value)}>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
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
              <h3><span className="si"><i className="fa-solid fa-users"></i></span> Penumpang ({form.passengers.length} pax)</h3>

              {/* Import from Invoice */}
              <div className="pax-import-toggle">
                <button className={`pax-import-btn ${showImport ? 'active' : ''}`} type="button" onClick={() => { setShowImport(!showImport); setImportFound(null); setImportError(''); setImportInvNum(''); }}>
                  <i className={`fa-solid ${showImport ? 'fa-chevron-up' : 'fa-file-import'}`}></i>
                  {showImport ? 'Tutup Import' : 'Import dari Invoice'}
                </button>
              </div>

              {showImport && (
                <div className="pax-import-box">
                  <div className="pax-import-row">
                    <div className="pax-import-input-wrap">
                      <i className="fa-solid fa-magnifying-glass"></i>
                      <input
                        type="text"
                        placeholder="Ketik nomor invoice, cth: INV/20260227/001"
                        value={importInvNum}
                        onChange={e => { setImportInvNum(e.target.value.toUpperCase()); setImportError(''); setImportFound(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') searchImportInvoice(); }}
                      />
                    </div>
                    <button className="pax-import-search" type="button" onClick={searchImportInvoice}>
                      <i className="fa-solid fa-search"></i> Cari
                    </button>
                  </div>

                  {importError && (
                    <div className="pax-import-error">
                      <i className="fa-solid fa-circle-exclamation"></i> {importError}
                    </div>
                  )}

                  {importFound && (
                    <div className="pax-import-preview">
                      <div className="pax-import-info">
                        <div className="pax-import-inv">
                          <i className="fa-solid fa-file-invoice"></i> {importFound.invoice.invoiceNumber}
                        </div>
                        <div className="pax-import-meta">
                          {importFound.billTo.name} &bull; {importFound.flight.routeFrom} → {importFound.flight.routeTo} &bull; {importFound.passengers.length} pax
                        </div>
                      </div>
                      <div className="pax-import-list">
                        {importFound.passengers.map((p, i) => (
                          <div key={p.id} className="pax-import-item">
                            <span className="pax-import-num">{i + 1}</span>
                            <span className="pax-import-name">{p.title}. {p.name}</span>
                            <span className="pax-import-type">{p.type}</span>
                          </div>
                        ))}
                      </div>
                      <button className="pax-import-confirm" type="button" onClick={importPassengers}>
                        <i className="fa-solid fa-download"></i> Import {importFound.passengers.length} Penumpang
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
              {form.passengers.map((pax, idx) => (
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
                            onClick={() => { updatePax(pax.id, 'title', opt.value); setOpenTitleDD(null); }}
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
                      onChange={e => updatePax(pax.id, 'name', e.target.value.toUpperCase())} />
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
                            onClick={() => { updatePax(pax.id, 'type', opt.value); setOpenTypeDD(null); }}
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
                    <input type="date" value={pax.dob}
                      onChange={e => updatePax(pax.id, 'dob', e.target.value)} />
                  </div>
                  <div className="pax-cell" data-label="No. Paspor">
                    <input type="text" placeholder="A12345678" value={pax.passport}
                      onChange={e => updatePax(pax.id, 'passport', e.target.value.toUpperCase())} />
                  </div>
                  <div className="pax-cell" data-label="Expired Paspor">
                    <input type="date" value={pax.passportExpiry}
                      onChange={e => updatePax(pax.id, 'passportExpiry', e.target.value)} />
                  </div>
                  <div className="pax-act">
                    {form.passengers.length > 1 && (
                      <button className="btn-del" onClick={() => removePax(pax.id)}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button className="btn-add-pax" onClick={addPax}>
                <i className="fa-solid fa-plus"></i> Tambah Penumpang
              </button>
            </div>

            <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</> :
                <><i className="fa-solid fa-paper-plane"></i> Kirim Booking</>}
            </button>
          </div>
        ) : (
          /* ===== BOOKING LIST ===== */
          (() => {
            let filtered = statusFilter ? bookings.filter(b => b.status === statusFilter) : [...bookings];

            // Search filter: invoice, date, passenger name
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim();
              filtered = filtered.filter(b =>
                (b.invoice.invoiceNumber || '').toLowerCase().includes(q) ||
                (b.flight.departureDate || '').includes(q) ||
                (b.invoice.invoiceDate || '').includes(q) ||
                b.passengers.some(p => p.name.toLowerCase().includes(q))
              );
            }

            const totalPages = Math.ceil(filtered.length / PER_PAGE);
            const safePage = Math.min(page, totalPages || 1);
            const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
            const startIdx = (safePage - 1) * PER_PAGE;
            const hasFilter = !!statusFilter || !!searchQuery.trim();

            return (
              <div className="booking-list">
                {/* Search bar */}
                <div className="bl-search">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input
                    type="text"
                    placeholder="Cari invoice, tanggal, atau nama penumpang..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                  />
                  {searchQuery && (
                    <button className="bl-search-clear" onClick={() => { setSearchQuery(''); setPage(1); }}>
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  )}
                </div>

                {/* List info bar */}
                {filtered.length > 0 && (
                  <div className="bl-info">
                    <span>Menampilkan {startIdx + 1}–{Math.min(startIdx + PER_PAGE, filtered.length)} dari {filtered.length} booking</span>
                    {hasFilter && (
                      <button className="bl-clear" onClick={() => { setStatusFilter(null); setSearchQuery(''); setPage(1); }}>
                        <i className="fa-solid fa-xmark"></i> Hapus filter
                      </button>
                    )}
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div className="empty-state">
                    <i className="fa-solid fa-inbox"></i>
                    <p>{statusFilter ? `Tidak ada booking ${statusLabel(statusFilter).toLowerCase()}` : 'Belum ada booking'}</p>
                    {statusFilter ? (
                      <button onClick={() => { setStatusFilter(null); setPage(1); }}>Lihat Semua</button>
                    ) : (
                      <button onClick={() => setTab('new')}>Buat Booking Baru</button>
                    )}
                  </div>
                ) : (
                  <>
                    {paged.map(b => (
                      <div key={b.id} className={`booking-card status-${b.status}`} onClick={() => setViewId(b.id)}>
                        <div className="bc-left">
                          <span className="route-tag">{b.flight.routeFrom} → {b.flight.routeTo}</span>
                        </div>
                        <div className="bc-main">
                          {b.invoice.invoiceNumber && (
                            <div className="bc-invoice">
                              <i className="fa-solid fa-file-invoice"></i> {b.invoice.invoiceNumber}
                            </div>
                          )}
                          <div className="bc-row1">
                            <span className="bc-customer">{b.billTo.name}</span>
                            <span className={`badge ${b.status}`}>{statusLabel(b.status)}</span>
                          </div>
                          <div className="bc-row2">
                            <span className="flight-tag">{b.flight.flightNumber}</span>
                            {b.flight.departureDate && <span className="bc-meta">{formatDateIndo(b.flight.departureDate)}</span>}
                            <span className="bc-meta">{b.passengers.length} pax</span>
                          </div>
                        </div>
                        <div className="bc-arrow"><i className="fa-solid fa-chevron-right"></i></div>
                      </div>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="pagination">
                        <button
                          className="pg-btn"
                          disabled={safePage <= 1}
                          onClick={() => setPage(safePage - 1)}
                        >
                          <i className="fa-solid fa-chevron-left"></i>
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                          .reduce<(number | string)[]>((acc, p, idx, arr) => {
                            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, i) =>
                            typeof p === 'string' ? (
                              <span key={`dot-${i}`} className="pg-dots">...</span>
                            ) : (
                              <button
                                key={p}
                                className={`pg-btn ${p === safePage ? 'pg-active' : ''}`}
                                onClick={() => setPage(p)}
                              >
                                {p}
                              </button>
                            )
                          )}

                        <button
                          className="pg-btn"
                          disabled={safePage >= totalPages}
                          onClick={() => setPage(safePage + 1)}
                        >
                          <i className="fa-solid fa-chevron-right"></i>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>
          <i className="fa-solid fa-plus-circle"></i>
          <span>Booking Baru</span>
        </button>
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>
          <i className="fa-solid fa-list"></i>
          <span>Booking Saya</span>
          {bookings.length > 0 && <span className="bnav-badge">{bookings.length}</span>}
        </button>
        <button className="bnav-logout" onClick={logout}>
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>Logout</span>
        </button>
      </nav>
      </>
      )}
    </div>
  );
}
