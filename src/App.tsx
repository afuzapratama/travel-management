// ============================================
// APP — Travel Panel System
// PT Global Teknik Multi Guna
// Routes: Login → Agent Panel / Admin Panel
// ============================================

import { useApp } from './context/AppContext';
import LoginPage from './components/LoginPage';
import AgentPanel from './components/AgentPanel';
import AdminPanel from './components/AdminPanel';
import './App.css';

function LoadingScreen() {
  return (
    <div className="ls-overlay">
      <div className="ls-card">
        {/* Animated plane */}
        <div className="ls-plane-wrap">
          <div className="ls-trail"></div>
          <div className="ls-plane">
            <i className="fa-solid fa-plane"></i>
          </div>
        </div>

        {/* Pulsing dots loader */}
        <div className="ls-dots">
          <span></span><span></span><span></span>
        </div>

        {/* Text */}
        <div className="ls-text">
          <h3>Memuat Data</h3>
          <p>Menyiapkan dashboard untuk Anda...</p>
        </div>

        {/* Progress bar */}
        <div className="ls-bar">
          <div className="ls-bar-fill"></div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, initialLoading } = useApp();

  if (!user) return <LoginPage />;
  if (initialLoading) return <LoadingScreen />;
  if (user.role === 'agent') return <AgentPanel />;
  if (user.role === 'admin') return <AdminPanel />;

  return null;
}

export default App;
