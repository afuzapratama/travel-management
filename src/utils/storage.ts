// ============================================
// LOCAL STORAGE — Booking data persistence
// ============================================

import type { Booking } from '../types/booking';

const BOOKINGS_KEY = 'gtmg_travel_bookings';

export function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookings(bookings: Booking[]): void {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export function clearBookings(): void {
  localStorage.removeItem(BOOKINGS_KEY);
}
