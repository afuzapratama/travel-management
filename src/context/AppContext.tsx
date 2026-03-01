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
  restoreBookingInDb,
  permanentDeleteBookingFromDb,
  fetchDeletedBookings,
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
  restoreBooking: (id: string) => Promise<void>;
  permanentDeleteBooking: (id: string) => Promise<void>;
  deletedBookings: Booking[];
  refreshBookings: () => Promise<void>;
  refreshDeletedBookings: () => Promise<void>;
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
  const [deletedBookings, setDeletedBookings] = useState<Booking[]>([]);

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

  // Load deleted (trashed) bookings — admin only
  const refreshDeletedBookings = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const data = await fetchDeletedBookings();
      setDeletedBookings(data);
    } catch (err) {
      console.error('Failed to load deleted bookings:', err);
    }
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
      Promise.all([refreshBookings(), refreshCompanySettings(), refreshDeletedBookings()]).finally(() => {
        setInitialLoading(false);
      });
    } else {
      setBookings([]);
      setInitialLoading(false);
    }
  }, [user, refreshBookings, refreshCompanySettings]);

  // ===== MUTATION TRACKING (prevents Realtime race conditions) =====
  // When creating/updating bookings, Realtime events can fire BEFORE
  // passengers are inserted, causing fetchBookingById to return 0 passengers.
  // These refs tell the Realtime handler to skip events during local mutations.
  const isCreatingRef = useRef(false);
  const mutatingIdsRef = useRef<Set<string>>(new Set());

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
          // Skip if this client is currently creating a booking.
          // The Realtime event fires BEFORE passengers are inserted,
          // so fetchBookingById would return 0 passengers (race condition).
          if (isCreatingRef.current) return;
          // If agent, only add if it belongs to them
          if (agentId && payload.new.agent_id !== agentId) return;
          // Small delay to allow passengers to be fully inserted
          await new Promise(r => setTimeout(r, 800));
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
          // Skip if this client is currently updating this booking.
          // updateBookingInDb does DELETE + INSERT on passengers,
          // so fetching mid-mutation would return 0 passengers (race condition).
          if (mutatingIdsRef.current.has(updatedId)) return;
          if (agentId && payload.new.agent_id !== agentId) return;

          // Handle soft-delete: if deleted_at is set, remove from active bookings
          if (payload.new.deleted_at) {
            setBookings(prev => prev.filter(b => b.id !== updatedId));
            return;
          }
          // Handle restore: if deleted_at was cleared, the booking should re-appear
          const wasDeleted = payload.old?.deleted_at;
          if (wasDeleted && !payload.new.deleted_at) {
            await new Promise(r => setTimeout(r, 300));
            const full = await fetchBookingById(updatedId);
            if (full) {
              setBookings(prev => {
                if (prev.some(b => b.id === full.id)) return prev;
                return [full, ...prev];
              });
            }
            return;
          }

          // Small delay to allow passenger re-insert to complete
          await new Promise(r => setTimeout(r, 800));
          // Re-check after delay (mutation might have started during the wait)
          if (mutatingIdsRef.current.has(updatedId)) return;
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
    isCreatingRef.current = true;
    try {
      const created = await createBookingInDb(booking);
      setBookings(prev => {
        // Remove any stale entry that Realtime might have added (without passengers)
        const filtered = prev.filter(b => b.id !== created.id);
        return [created, ...filtered];
      });
      return created;
    } finally {
      isCreatingRef.current = false;
    }
  }, []);

  const updateBooking = useCallback(async (booking: Booking): Promise<void> => {
    mutatingIdsRef.current.add(booking.id);
    try {
      await updateBookingInDb(booking);
      setBookings(prev =>
        prev.map(b => b.id === booking.id ? { ...booking, updatedAt: new Date().toISOString() } : b)
      );
    } finally {
      mutatingIdsRef.current.delete(booking.id);
    }
  }, []);

  const deleteBooking = useCallback(async (id: string): Promise<void> => {
    // Find the booking before soft-deleting so we can move it to trash
    const toDelete = bookings.find(b => b.id === id);
    await deleteBookingFromDb(id);
    setBookings(prev => prev.filter(b => b.id !== id));
    // Add to deleted list with timestamp
    if (toDelete) {
      setDeletedBookings(prev => [{ ...toDelete, deletedAt: new Date().toISOString() }, ...prev]);
    }
  }, [bookings]);

  const restoreBooking = useCallback(async (id: string): Promise<void> => {
    await restoreBookingInDb(id);
    const restored = deletedBookings.find(b => b.id === id);
    setDeletedBookings(prev => prev.filter(b => b.id !== id));
    if (restored) {
      setBookings(prev => [{ ...restored, deletedAt: null }, ...prev]);
    }
  }, [deletedBookings]);

  const permanentDeleteBooking = useCallback(async (id: string): Promise<void> => {
    await permanentDeleteBookingFromDb(id);
    setDeletedBookings(prev => prev.filter(b => b.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      user, bookings, loading, initialLoading, companySettings, deletedBookings,
      login, logout,
      addBooking, updateBooking, deleteBooking,
      restoreBooking, permanentDeleteBooking,
      refreshBookings, refreshDeletedBookings, refreshCompanySettings,
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
