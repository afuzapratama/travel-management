// ============================================
// APP CONTEXT - Global State Management
// Backed by Supabase + Realtime Subscriptions
// ============================================

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Booking } from '../types/booking';
import type { Agent } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';
import {
  validateKey,
  fetchBookings,
  fetchBookingById,
  createBooking as createBookingInDb,
  updateBookingInDb,
  deleteBookingFromDb,
  getCompanySettings,
  type CompanySettings,
} from '../lib/supabaseService';

interface User {
  role: 'agent' | 'admin';
  keyId: string;
  agent?: Agent; // only for agent role
}

interface AppContextType {
  user: User | null;
  bookings: Booking[];
  loading: boolean;
  initialLoading: boolean;
  companySettings: CompanySettings | null;
  login: (key: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addBooking: (booking: Booking) => Promise<Booking>;
  updateBooking: (booking: Booking) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  refreshBookings: () => Promise<void>;
  refreshCompanySettings: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Restore session from sessionStorage
    try {
      const raw = sessionStorage.getItem('gtmg_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(() => {
    // If user exists from session, we need to load data first
    try { return !!sessionStorage.getItem('gtmg_user'); } catch { return false; }
  });
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  // Persist session
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('gtmg_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('gtmg_user');
    }
  }, [user]);

  // Load bookings when user is set
  const refreshBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Agent sees only their bookings, admin sees all
      const agentId = user.role === 'agent' ? user.agent?.id : undefined;
      const data = await fetchBookings(agentId);
      setBookings(data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
    setLoading(false);
  }, [user]);

  // Load company settings (global logo & TTD)
  const refreshCompanySettings = useCallback(async () => {
    try {
      const settings = await getCompanySettings();
      setCompanySettings(settings);
    } catch (err) {
      console.error('Failed to load company settings:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setInitialLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
      Promise.all([refreshBookings(), refreshCompanySettings()]).finally(() => {
        setInitialLoading(false);
      });
    } else {
      setBookings([]);
      setInitialLoading(false);
    }
  }, [user, refreshBookings, refreshCompanySettings]);

  // ===== SUPABASE REALTIME SUBSCRIPTION =====
  // Keeps bookings list in sync across all clients (agent ↔ admin)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    const agentId = user.role === 'agent' ? user.agent?.id : undefined;

    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        async (payload) => {
          const newId = payload.new.id as string;
          // If agent, only add if it belongs to them
          if (agentId && payload.new.agent_id !== agentId) return;
          // Fetch full booking with passengers
          const full = await fetchBookingById(newId);
          if (full) {
            setBookings(prev => {
              // Avoid duplicates (if we just created it ourselves)
              if (prev.some(b => b.id === full.id)) return prev;
              return [full, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        async (payload) => {
          const updatedId = payload.new.id as string;
          if (agentId && payload.new.agent_id !== agentId) return;
          // Fetch full booking with passengers
          const full = await fetchBookingById(updatedId);
          if (full) {
            setBookings(prev =>
              prev.map(b => b.id === full.id ? full : b)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bookings' },
        (payload) => {
          const deletedId = payload.old.id as string;
          setBookings(prev => prev.filter(b => b.id !== deletedId));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user]);

  // Login — validate key against Supabase
  const login = useCallback(async (key: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await validateKey(key);
      if (!result.valid || !result.role || !result.keyId) {
        return { success: false, error: 'Access key salah atau tidak aktif!' };
      }
      setUser({ role: result.role, keyId: result.keyId, agent: result.agent });
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Gagal terhubung ke server' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setBookings([]);
  }, []);

  const addBooking = useCallback(async (booking: Booking): Promise<Booking> => {
    const created = await createBookingInDb(booking);
    setBookings(prev => [created, ...prev]);
    return created;
  }, []);

  const updateBooking = useCallback(async (booking: Booking): Promise<void> => {
    await updateBookingInDb(booking);
    setBookings(prev =>
      prev.map(b => b.id === booking.id ? { ...booking, updatedAt: new Date().toISOString() } : b)
    );
  }, []);

  const deleteBooking = useCallback(async (id: string): Promise<void> => {
    await deleteBookingFromDb(id);
    setBookings(prev => prev.filter(b => b.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      user, bookings, loading, initialLoading, companySettings,
      login, logout,
      addBooking, updateBooking, deleteBooking,
      refreshBookings, refreshCompanySettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
