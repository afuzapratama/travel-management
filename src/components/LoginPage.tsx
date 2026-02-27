// ============================================
// LOGIN PAGE
// Single key input — role auto-detected from DB
// ============================================

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useApp();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!key.trim()) {
      setError('Masukkan access key');
      triggerShake();
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(key.trim());
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Access key salah!');
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="login-container">
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        {/* Logo */}
        <div className="login-header">
          <div className="login-logo">
            <i className="fa-solid fa-plane-departure"></i>
          </div>
          <h1>Travel Panel</h1>
          <p>PT Global Teknik Multi Guna</p>
        </div>

        {/* Key Input */}
        <div className="login-form">
          <div className={`input-group ${error ? 'error' : ''}`}>
            <i className="fa-solid fa-key"></i>
            <input
              type="password"
              placeholder="Masukkan Access Key"
              value={key}
              onChange={e => { setKey(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
              autoFocus
              disabled={loading}
            />
          </div>
          {error && (
            <div className="login-error">
              <i className="fa-solid fa-circle-exclamation"></i> {error}
            </div>
          )}
          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Memverifikasi...</>
            ) : (
              <><i className="fa-solid fa-right-to-bracket"></i> Masuk</>
            )}
          </button>
          <p className="login-hint">Role otomatis terdeteksi dari access key</p>
        </div>

        <div className="login-footer">
          <p>© 2026 PT Global Teknik Multi Guna</p>
        </div>
      </div>
    </div>
  );
}
