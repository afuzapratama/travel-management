// ============================================
// ADMIN PANEL
// Dashboard with booking management + settings
// ============================================

import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { Booking } from '../types/booking';
import { formatDateSlash } from '../utils/formatDate';
import { formatRupiah } from '../utils/formatCurrency';
import AdminInvoiceView from './AdminInvoiceView';
import AdminSettings from './AdminSettings';
import { useConfirm } from './ConfirmDialog';
import './AdminPanel.css';

type Tab = 'request' | 'active' | 'all' | 'settings' | 'trash';

// Persist admin navigation state
const NAV_KEY = 'gtmg_admin_nav';
function loadNav(): { tab: Tab; viewId: string | null } {
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { tab: 'request', viewId: null };
}

export default function AdminPanel() {
  const { bookings, deleteBooking, deletedBookings, restoreBooking, permanentDeleteBooking, logout, loading } = useApp();
  const confirm = useConfirm();
  const savedNav = loadNav();
  const [tab, _setTab] = useState<Tab>(savedNav.tab);
  const [viewId, _setViewId] = useState<string | null>(savedNav.viewId);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const setTab = useCallback((t: Tab) => {
    _setTab(t);
    setPage(1);
    sessionStorage.setItem(NAV_KEY, JSON.stringify({ tab: t, viewId: null }));
  }, []);

  const setViewId = useCallback((id: string | null) => {
    _setViewId(id);
    const t = tab;
    sessionStorage.setItem(NAV_KEY, JSON.stringify({ tab: t, viewId: id }));
  }, [tab]);

  const counts = useMemo(() => ({
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    total: bookings.length,
    trash: deletedBookings.length,
  }), [bookings, deletedBookings]);

  const filtered = useMemo(() => {
    switch (tab) {
      case 'request': return bookings.filter(b => b.status === 'pending');
      case 'active': return bookings.filter(b => b.status === 'confirmed');
      case 'all': default: return bookings;
    }
  }, [bookings, tab]);

  const grandTotal = (b: Booking) =>
    b.pricePerPax * b.passengers.length - b.discount;

  const statusLabel: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Berjalan',
    completed: 'Selesai',
    cancelled: 'Batal',
  };

  // If viewing a booking's invoice
  if (viewId) {
    // Wait for bookings to load before rendering invoice view
    const found = bookings.find(b => b.id === viewId);
    if (!found && loading) {
      return (
        <div className="panel-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', color: '#636E72' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28, marginBottom: 12 }}></i>
            <p>Memuat invoice...</p>
          </div>
        </div>
      );
    }
    if (!found && !loading) {
      // Booking not found (maybe deleted), go back to dashboard
      sessionStorage.setItem(NAV_KEY, JSON.stringify({ tab, viewId: null }));
      _setViewId(null);
      return null;
    }
    return <AdminInvoiceView bookingId={viewId} onBack={() => setViewId(null)} />;
  }

  return (
    <div className="panel-container">
      {/* Top Bar */}
      <div className="panel-topbar">
        <div className="topbar-left">
          <div className="topbar-icon admin-icon">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h2>Admin Panel</h2>
            <p>PT Global Teknik Multi Guna</p>
          </div>
        </div>
        <button className="btn-logout" onClick={logout}>
          <i className="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="panel-tabs" style={{ background: '#fff' }}>
        <button className={tab === 'request' ? 'active' : ''} onClick={() => setTab('request')}>
          <i className="fa-solid fa-bell"></i> Request Booking
          {counts.pending > 0 && <span className="tab-badge">{counts.pending}</span>}
        </button>
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>
          <i className="fa-solid fa-plane-departure"></i> Booking Berjalan
        </button>
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          <i className="fa-solid fa-list"></i> Semua Booking
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          <i className="fa-solid fa-gear"></i> Pengaturan
        </button>
        <button className={tab === 'trash' ? 'active' : ''} onClick={() => setTab('trash')}>
          <i className="fa-solid fa-trash-can"></i> Sampah
          {counts.trash > 0 && <span className="tab-badge trash-badge">{counts.trash}</span>}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-card pending" onClick={() => setTab('request')}>
          <div className="stat-num">{counts.pending}</div>
          <div className="stat-label">Request Booking</div>
        </div>
        <div className="stat-card confirmed" onClick={() => setTab('active')}>
          <div className="stat-num">{counts.confirmed}</div>
          <div className="stat-label">Booking Berjalan</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-num">{counts.completed}</div>
          <div className="stat-label">Selesai</div>
        </div>
        <div className="stat-card total" onClick={() => setTab('all')}>
          <div className="stat-num">{counts.total}</div>
          <div className="stat-label">Total Booking</div>
        </div>
      </div>

      {/* Content */}
      <div className="admin-content">
        {tab === 'settings' ? (
          <AdminSettings />
        ) : tab === 'trash' ? (
          /* ===== TRASH TAB ===== */
          deletedBookings.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-trash-can"></i>
              <p>Sampah kosong</p>
              <span style={{ fontSize: 12, color: '#B2BEC3' }}>Booking yang dihapus akan muncul di sini dan bisa di-restore</span>
            </div>
          ) : (
            <>
            <div className="admin-info-bar">
              <span><i className="fa-solid fa-circle-info"></i> {deletedBookings.length} booking di sampah — data aman, bisa di-restore kapan saja</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}>#</th>
                    <th style={{ width: '14%' }}>Dihapus</th>
                    <th style={{ width: '18%' }}>Pelanggan</th>
                    <th style={{ width: '12%' }}>Rute</th>
                    <th style={{ width: '8%' }}>Flight</th>
                    <th style={{ width: '6%' }}>Pax</th>
                    <th style={{ width: '10%' }}>Status</th>
                    <th style={{ width: '12%' }}>Invoice</th>
                    <th style={{ width: '16%' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedBookings.map((b, i) => (
                    <tr key={b.id} className="trash-row">
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td>
                        <span style={{ fontSize: 11, color: '#D63031', fontWeight: 500 }}>
                          {b.deletedAt ? new Date(b.deletedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </td>
                      <td><strong>{b.billTo.name || '—'}</strong></td>
                      <td><span className="route-tag-sm">{b.flight.routeFrom} → {b.flight.routeTo}</span></td>
                      <td><span className="flight-tag">{b.flight.flightNumber}</span></td>
                      <td style={{ textAlign: 'center' }}><strong>{b.passengers.length}</strong></td>
                      <td><span className={`badge ${b.status}`}><i className={`fa-solid ${b.status === 'pending' ? 'fa-clock' : b.status === 'confirmed' ? 'fa-plane' : b.status === 'completed' ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i> {statusLabel[b.status]}</span></td>
                      <td>
                        <span style={{ fontSize: 11, color: b.invoice.invoiceNumber ? '#1B3A5C' : '#B2BEC3', fontWeight: 600 }}>
                          {b.invoice.invoiceNumber || '—'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="act-btn restore" onClick={async () => {
                            await restoreBooking(b.id);
                          }} title="Restore">
                            <i className="fa-solid fa-rotate-left"></i>
                          </button>
                          <button className="act-btn del" onClick={async () => {
                            const ok = await confirm({
                              title: 'Hapus Permanen',
                              message: `Hapus permanen booking ${b.billTo.name}? Data tidak bisa dikembalikan lagi!`,
                              confirmText: 'Ya, Hapus Permanen',
                              variant: 'danger',
                              icon: 'fa-trash-can'
                            });
                            if (ok) await permanentDeleteBooking(b.id);
                          }} title="Hapus Permanen">
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-inbox"></i>
            <p>{tab === 'request' ? 'Tidak ada request booking baru' : tab === 'active' ? 'Tidak ada booking berjalan' : 'Belum ada booking'}</p>
          </div>
        ) : (
          <>
          {/* Info bar */}
          {filtered.length > 0 && (() => {
            const totalPages = Math.ceil(filtered.length / PER_PAGE);
            const safePage = Math.min(page, totalPages || 1);
            const startIdx = (safePage - 1) * PER_PAGE;
            return (
              <div className="admin-info-bar">
                <span>Menampilkan {startIdx + 1}–{Math.min(startIdx + PER_PAGE, filtered.length)} dari {filtered.length} booking</span>
              </div>
            );
          })()}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>#</th>
                  <th style={{ width: '12%' }}>Tanggal</th>
                  <th style={{ width: '18%' }}>Pelanggan</th>
                  <th style={{ width: '12%' }}>Rute</th>
                  <th style={{ width: '8%' }}>Flight</th>
                  <th style={{ width: '6%' }}>Pax</th>
                  <th style={{ width: '12%' }}>Total</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '10%' }}>Invoice</th>
                  <th style={{ width: '8%' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalPages = Math.ceil(filtered.length / PER_PAGE);
                  const safePage = Math.min(page, totalPages || 1);
                  const startIdx = (safePage - 1) * PER_PAGE;
                  return filtered.slice(startIdx, startIdx + PER_PAGE).map((b, i) => (
                  <tr key={b.id} onClick={() => setViewId(b.id)} className="clickable-row">
                    <td style={{ textAlign: 'center' }}>{startIdx + i + 1}</td>
                    <td>{formatDateSlash(b.createdAt.slice(0, 10))}</td>
                    <td><strong>{b.billTo.name || '—'}</strong></td>
                    <td>
                      <span className="route-tag-sm">{b.flight.routeFrom} → {b.flight.routeTo}</span>
                    </td>
                    <td><span className="flight-tag">{b.flight.flightNumber}</span></td>
                    <td style={{ textAlign: 'center' }}><strong>{b.passengers.length}</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {grandTotal(b) > 0 ? `Rp ${formatRupiah(grandTotal(b))}` : '—'}
                    </td>
                    <td><span className={`badge ${b.status}`}><i className={`fa-solid ${b.status === 'pending' ? 'fa-clock' : b.status === 'confirmed' ? 'fa-plane' : b.status === 'completed' ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i> {statusLabel[b.status]}</span></td>
                    <td>
                      <span style={{ fontSize: 11, color: b.invoice.invoiceNumber ? '#1B3A5C' : '#B2BEC3', fontWeight: 600 }}>
                        {b.invoice.invoiceNumber || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions" onClick={e => e.stopPropagation()}>
                        <button className="act-btn view" onClick={() => setViewId(b.id)} title="Lihat / Edit">
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button className="act-btn del" onClick={async () => {
                          const ok = await confirm({
                            title: 'Hapus Booking',
                            message: `Hapus booking ${b.billTo.name}?`,
                            confirmText: 'Ya, Hapus',
                            variant: 'danger',
                            icon: 'fa-trash-can'
                          });
                          if (ok) await deleteBooking(b.id);
                        }} title="Hapus">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(filtered.length / PER_PAGE);
            const safePage = Math.min(page, totalPages || 1);
            if (totalPages <= 1) return null;
            return (
              <div className="admin-pagination">
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
            );
          })()}
          </>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <button className={tab === 'request' ? 'active' : ''} onClick={() => setTab('request')}>
          <i className="fa-solid fa-bell"></i>
          <span>Request</span>
          {counts.pending > 0 && <span className="bnav-badge">{counts.pending}</span>}
        </button>
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>
          <i className="fa-solid fa-plane-departure"></i>
          <span>Berjalan</span>
        </button>
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          <i className="fa-solid fa-list"></i>
          <span>Semua</span>
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          <i className="fa-solid fa-gear"></i>
          <span>Setting</span>
        </button>
        <button className={`${tab === 'trash' ? 'active' : ''} ${counts.trash > 0 ? 'has-trash' : ''}`} onClick={() => setTab('trash')}>
          <i className="fa-solid fa-trash-can"></i>
          <span>Sampah</span>
          {counts.trash > 0 && <span className="bnav-badge">{counts.trash}</span>}
        </button>
        <button className="bnav-logout" onClick={logout}>
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
