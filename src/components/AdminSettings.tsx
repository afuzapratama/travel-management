// ============================================
// ADMIN SETTINGS
// Manage access keys + agent profiles
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { AccessKey, Agent } from '../lib/supabaseService';
import {
  getAllKeys, createKey, updateKey, deleteKey,
  getAllAgents, createAgent, updateAgent, deleteAgent,
  getCompanySettings, updateCompanySettings,
} from '../lib/supabaseService';
import './AdminSettings.css';

export default function AdminSettings() {
  const { refreshCompanySettings } = useApp();

  // ===== STATE =====
  const [activeTab, setActiveTab] = useState<'keys' | 'agents' | 'company'>('keys');
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Key form
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyForm, setKeyForm] = useState({ role: 'agent' as 'agent' | 'admin', keyValue: '', label: '' });

  // Agent form
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentForm, setAgentForm] = useState({ name: '', companyName: '', phone: '', email: '', address: '', accessKeyId: '' });

  // Company settings (logo & TTD)
  const [companyLogo, setCompanyLogo] = useState('');
  const [companySignature, setCompanySignature] = useState('');
  const [companySaving, setCompanySaving] = useState(false);

  // ===== LOAD DATA =====
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [k, a] = await Promise.all([getAllKeys(), getAllAgents()]);
      setKeys(k);
      setAgents(a);
    } catch (err) {
      setError('Gagal memuat data: ' + (err as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]); // eslint-disable-line react-hooks/set-state-in-effect

  // Load company settings
  useEffect(() => {
    getCompanySettings().then(s => {
      setCompanyLogo(s.logoUrl);
      setCompanySignature(s.signatureUrl);
    });
  }, []);

  // ===== COMPANY SETTINGS HANDLERS =====
  const handleCompanyUpload = (field: 'logo' | 'signature') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const prev = field === 'logo' ? companyLogo : companySignature;
        if (field === 'logo') setCompanyLogo(base64);
        else setCompanySignature(base64);
        setCompanySaving(true);
        try {
          await updateCompanySettings(
            field === 'logo' ? { logoUrl: base64 } : { signatureUrl: base64 }
          );
          await refreshCompanySettings();
        } catch (err) {
          // Revert local preview on failure
          if (field === 'logo') setCompanyLogo(prev);
          else setCompanySignature(prev);
          alert('Gagal menyimpan! Pastikan tabel company_settings sudah dibuat di Supabase.\n\n' + (err as Error).message);
        }
        setCompanySaving(false);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleCompanyDelete = async (field: 'logo' | 'signature') => {
    if (!confirm(`Hapus ${field === 'logo' ? 'logo' : 'tanda tangan'}?`)) return;
    const prev = field === 'logo' ? companyLogo : companySignature;
    if (field === 'logo') setCompanyLogo('');
    else setCompanySignature('');
    setCompanySaving(true);
    try {
      await updateCompanySettings(
        field === 'logo' ? { logoUrl: '' } : { signatureUrl: '' }
      );
      await refreshCompanySettings();
    } catch (err) {
      if (field === 'logo') setCompanyLogo(prev);
      else setCompanySignature(prev);
      alert('Gagal menghapus: ' + (err as Error).message);
    }
    setCompanySaving(false);
  };

  // ===== KEY HANDLERS =====
  const handleCreateKey = async () => {
    if (!keyForm.keyValue.trim()) return alert('Key tidak boleh kosong!');
    if (!keyForm.label.trim()) return alert('Label tidak boleh kosong!');
    try {
      await createKey(keyForm.role, keyForm.keyValue.trim(), keyForm.label.trim());
      setKeyForm({ role: 'agent', keyValue: '', label: '' });
      setShowKeyForm(false);
      await loadData();
    } catch (err) {
      alert('Gagal: ' + (err as Error).message);
    }
  };

  const handleToggleKey = async (key: AccessKey) => {
    try {
      await updateKey(key.id, { is_active: !key.isActive });
      await loadData();
    } catch (err) {
      alert('Gagal: ' + (err as Error).message);
    }
  };

  const handleDeleteKey = async (key: AccessKey) => {
    if (!confirm(`Hapus key "${key.label}"?`)) return;
    try {
      await deleteKey(key.id);
      await loadData();
    } catch (err) {
      alert('Gagal: ' + (err as Error).message);
    }
  };

  // ===== AGENT HANDLERS =====
  const openAgentForm = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      setAgentForm({
        name: agent.name,
        companyName: agent.companyName,
        phone: agent.phone,
        email: agent.email,
        address: agent.address,
        accessKeyId: agent.accessKeyId || '',
      });
    } else {
      setEditingAgent(null);
      setAgentForm({ name: '', companyName: '', phone: '', email: '', address: '', accessKeyId: '' });
    }
    setShowAgentForm(true);
  };

  const handleSaveAgent = async () => {
    if (!agentForm.name.trim()) return alert('Nama agent wajib diisi!');
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, {
          name: agentForm.name.trim(),
          companyName: agentForm.companyName.trim(),
          phone: agentForm.phone.trim(),
          email: agentForm.email.trim(),
          address: agentForm.address.trim(),
          accessKeyId: agentForm.accessKeyId || null,
        });
      } else {
        await createAgent({
          name: agentForm.name.trim(),
          companyName: agentForm.companyName.trim(),
          phone: agentForm.phone.trim(),
          email: agentForm.email.trim(),
          address: agentForm.address.trim(),
          accessKeyId: agentForm.accessKeyId || null,
          isActive: true,
        });
      }
      setShowAgentForm(false);
      setEditingAgent(null);
      await loadData();
    } catch (err) {
      alert('Gagal: ' + (err as Error).message);
    }
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (!confirm(`Hapus agent "${agent.name}"?`)) return;
    try {
      await deleteAgent(agent.id);
      await loadData();
    } catch (err) {
      alert('Gagal: ' + (err as Error).message);
    }
  };

  // Agent keys for dropdown
  const agentKeys = keys.filter(k => k.role === 'agent');

  if (loading) {
    return (
      <div className="settings-loading">
        <i className="fa-solid fa-spinner fa-spin"></i> Memuat pengaturan...
      </div>
    );
  }

  return (
    <div className="settings-container">
      {error && <div className="settings-error"><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      {/* Settings Tabs */}
      <div className="settings-tabs">
        <button className={activeTab === 'keys' ? 'active' : ''} onClick={() => setActiveTab('keys')}>
          <i className="fa-solid fa-key"></i> Access Keys
          <span className="stab-count">{keys.length}</span>
        </button>
        <button className={activeTab === 'agents' ? 'active' : ''} onClick={() => setActiveTab('agents')}>
          <i className="fa-solid fa-users"></i> Data Agent
          <span className="stab-count">{agents.length}</span>
        </button>
        <button className={activeTab === 'company' ? 'active' : ''} onClick={() => setActiveTab('company')}>
          <i className="fa-solid fa-building"></i> Perusahaan
        </button>
      </div>

      {/* ===== KEYS TAB ===== */}
      {activeTab === 'keys' && (
        <div className="settings-section">
          <div className="section-head">
            <div>
              <h3><i className="fa-solid fa-key"></i> Access Keys</h3>
              <p>Kelola semua access key untuk login agent dan admin</p>
            </div>
            <button className="btn-add" onClick={() => setShowKeyForm(true)}>
              <i className="fa-solid fa-plus"></i> Tambah Key
            </button>
          </div>

          {/* Key form */}
          {showKeyForm && (
            <div className="form-card">
              <h4>Tambah Access Key Baru</h4>
              <div className="form-grid">
                <div className="form-item">
                  <label>Role</label>
                  <select value={keyForm.role} onChange={e => setKeyForm(p => ({ ...p, role: e.target.value as 'agent' | 'admin' }))}>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-item">
                  <label>Key (Password)</label>
                  <input type="text" placeholder="masukkan key..." value={keyForm.keyValue}
                    onChange={e => setKeyForm(p => ({ ...p, keyValue: e.target.value }))} />
                </div>
                <div className="form-item">
                  <label>Label / Keterangan</label>
                  <input type="text" placeholder="cth: Agent Budi" value={keyForm.label}
                    onChange={e => setKeyForm(p => ({ ...p, label: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowKeyForm(false)}>Batal</button>
                <button className="btn-save" onClick={handleCreateKey}>
                  <i className="fa-solid fa-check"></i> Simpan
                </button>
              </div>
            </div>
          )}

          {/* Keys table */}
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '15%' }}>Role</th>
                  <th style={{ width: '25%' }}>Key</th>
                  <th style={{ width: '25%' }}>Label</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th style={{ width: '15%' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#B2BEC3', padding: 30 }}>Belum ada key</td></tr>
                ) : keys.map((k, i) => (
                  <tr key={k.id} className={!k.isActive ? 'inactive-row' : ''}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>
                      <span className={`role-badge ${k.role}`}>
                        <i className={`fa-solid ${k.role === 'admin' ? 'fa-shield-halved' : 'fa-headset'}`}></i>
                        {k.role.toUpperCase()}
                      </span>
                    </td>
                    <td><code className="key-code">{k.keyValue}</code></td>
                    <td>{k.label}</td>
                    <td>
                      <button className={`toggle-btn ${k.isActive ? 'on' : 'off'}`} onClick={() => handleToggleKey(k)}>
                        {k.isActive ? <><i className="fa-solid fa-circle-check"></i> Aktif</> : <><i className="fa-solid fa-ban"></i> Nonaktif</>}
                      </button>
                    </td>
                    <td>
                      <button className="act-btn del" onClick={() => handleDeleteKey(k)} title="Hapus">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== AGENTS TAB ===== */}
      {activeTab === 'agents' && (
        <div className="settings-section">
          <div className="section-head">
            <div>
              <h3><i className="fa-solid fa-users"></i> Data Agent</h3>
              <p>Kelola profil agent — data diri otomatis terisi saat agent login</p>
            </div>
            <button className="btn-add" onClick={() => openAgentForm()}>
              <i className="fa-solid fa-plus"></i> Tambah Agent
            </button>
          </div>

          {/* Agent form */}
          {showAgentForm && (
            <div className="form-card">
              <h4>{editingAgent ? 'Edit Agent' : 'Tambah Agent Baru'}</h4>
              <div className="form-grid">
                <div className="form-item">
                  <label>Nama Agent</label>
                  <input type="text" placeholder="Nama lengkap" value={agentForm.name}
                    onChange={e => setAgentForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-item">
                  <label>Nama Perusahaan</label>
                  <input type="text" placeholder="PT / CV ..." value={agentForm.companyName}
                    onChange={e => setAgentForm(p => ({ ...p, companyName: e.target.value }))} />
                </div>
                <div className="form-item">
                  <label>Telepon</label>
                  <input type="text" placeholder="+62xxx" value={agentForm.phone}
                    onChange={e => setAgentForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="form-item">
                  <label>Email</label>
                  <input type="email" placeholder="email@example.com" value={agentForm.email}
                    onChange={e => setAgentForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-item full">
                  <label>Alamat</label>
                  <input type="text" placeholder="Alamat lengkap" value={agentForm.address}
                    onChange={e => setAgentForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="form-item">
                  <label>Link ke Access Key</label>
                  <select value={agentForm.accessKeyId}
                    onChange={e => setAgentForm(p => ({ ...p, accessKeyId: e.target.value }))}>
                    <option value="">— Pilih Key Agent —</option>
                    {agentKeys.map(k => (
                      <option key={k.id} value={k.id}>{k.label} ({k.keyValue})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => { setShowAgentForm(false); setEditingAgent(null); }}>Batal</button>
                <button className="btn-save" onClick={handleSaveAgent}>
                  <i className="fa-solid fa-check"></i> {editingAgent ? 'Update' : 'Simpan'}
                </button>
              </div>
            </div>
          )}

          {/* Agents cards */}
          <div className="agent-grid">
            {agents.length === 0 ? (
              <div className="empty-state">
                <i className="fa-solid fa-user-slash"></i>
                <p>Belum ada data agent</p>
              </div>
            ) : agents.map(a => {
              const linkedKey = keys.find(k => k.id === a.accessKeyId);
              return (
                <div key={a.id} className={`agent-card ${!a.isActive ? 'inactive' : ''}`}>
                  <div className="ac-head">
                    <div className="ac-avatar">
                      <i className="fa-solid fa-user-tie"></i>
                    </div>
                    <div className="ac-info">
                      <h4>{a.name}</h4>
                      <p>{a.companyName || '—'}</p>
                    </div>
                    <div className="ac-actions">
                      <button className="act-btn edit" onClick={() => openAgentForm(a)} title="Edit">
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button className="act-btn del" onClick={() => handleDeleteAgent(a)} title="Hapus">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div className="ac-details">
                    {a.phone && <div className="ac-detail"><i className="fa-solid fa-phone"></i> {a.phone}</div>}
                    {a.email && <div className="ac-detail"><i className="fa-solid fa-envelope"></i> {a.email}</div>}
                    {a.address && <div className="ac-detail"><i className="fa-solid fa-location-dot"></i> {a.address}</div>}
                  </div>
                  <div className="ac-footer">
                    {linkedKey ? (
                      <span className="ac-key linked">
                        <i className="fa-solid fa-link"></i> Key: <code>{linkedKey.keyValue}</code> ({linkedKey.label})
                      </span>
                    ) : (
                      <span className="ac-key unlinked">
                        <i className="fa-solid fa-link-slash"></i> Belum terhubung ke key
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== COMPANY TAB ===== */}
      {activeTab === 'company' && (
        <div className="settings-section">
          <div className="section-head">
            <div>
              <h3><i className="fa-solid fa-building"></i> Data Perusahaan</h3>
              <p>Logo & tanda tangan untuk invoice — otomatis terpakai di semua booking</p>
            </div>
            {companySaving && (
              <span className="saving-indicator">
                <i className="fa-solid fa-spinner fa-spin"></i> Menyimpan...
              </span>
            )}
          </div>

          <div className="company-uploads">
            {/* Logo */}
            <div className="upload-card">
              <div className="upload-label">
                <i className="fa-solid fa-image"></i> Logo Perusahaan
              </div>
              <p className="upload-desc">Ditampilkan di header invoice</p>
              <div className="upload-preview">
                {companyLogo ? (
                  <img src={companyLogo} alt="Logo" />
                ) : (
                  <div className="upload-empty">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span>Belum ada logo</span>
                  </div>
                )}
              </div>
              <div className="upload-actions">
                <button className="btn-upload" onClick={() => handleCompanyUpload('logo')}>
                  <i className="fa-solid fa-upload"></i> {companyLogo ? 'Ganti' : 'Upload'} Logo
                </button>
                {companyLogo && (
                  <button className="btn-remove" onClick={() => handleCompanyDelete('logo')}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Signature / TTD */}
            <div className="upload-card">
              <div className="upload-label">
                <i className="fa-solid fa-signature"></i> Tanda Tangan (TTD)
              </div>
              <p className="upload-desc">Ditampilkan di area tanda tangan invoice</p>
              <div className="upload-preview">
                {companySignature ? (
                  <img src={companySignature} alt="TTD" />
                ) : (
                  <div className="upload-empty">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span>Belum ada TTD</span>
                  </div>
                )}
              </div>
              <div className="upload-actions">
                <button className="btn-upload" onClick={() => handleCompanyUpload('signature')}>
                  <i className="fa-solid fa-upload"></i> {companySignature ? 'Ganti' : 'Upload'} TTD
                </button>
                {companySignature && (
                  <button className="btn-remove" onClick={() => handleCompanyDelete('signature')}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                )}
              </div>
              <p className="upload-hint">
                <i className="fa-solid fa-circle-info"></i> TTD otomatis muncul di invoice ketika status booking = <strong>Selesai</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
