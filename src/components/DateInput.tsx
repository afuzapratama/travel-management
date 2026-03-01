// ============================================
// DATE INPUT — Custom DD/MM/YYYY date input
// Displays & accepts DD/MM/YYYY, stores YYYY-MM-DD
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';

interface DateInputProps {
  value: string;                    // YYYY-MM-DD from state
  onChange: (iso: string) => void;  // returns YYYY-MM-DD
  placeholder?: string;
  className?: string;
  min?: string;                     // YYYY-MM-DD
  max?: string;                     // YYYY-MM-DD
}

/** Convert YYYY-MM-DD → DD/MM/YYYY */
function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Convert DD/MM/YYYY → YYYY-MM-DD (returns '' if invalid) */
function displayToIso(display: string): string {
  const cleaned = display.replace(/[^0-9/]/g, '');
  const parts = cleaned.split('/');
  if (parts.length !== 3) return '';
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length !== 4) return '';
  const d = parseInt(dd, 10);
  const m = parseInt(mm, 10);
  const y = parseInt(yyyy, 10);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return '';
  // Validate the date is real
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return '';
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/** Auto-format: insert '/' after DD and MM as user types */
function autoFormat(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export default function DateInput({ value, onChange, placeholder, className, min, max }: DateInputProps) {
  const [text, setText] = useState(() => isoToDisplay(value));
  const [focused, setFocused] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync text when value changes externally (not while user is typing)
  useEffect(() => {
    if (!focused) {
      setText(isoToDisplay(value));
    }
  }, [value, focused]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = autoFormat(raw);
    setText(formatted);

    // If complete DD/MM/YYYY, convert and emit
    if (formatted.length === 10) {
      const iso = displayToIso(formatted);
      if (iso) {
        onChange(iso);
      }
    } else if (formatted.length === 0) {
      onChange('');
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    // On blur, validate and fix
    if (text.length === 10) {
      const iso = displayToIso(text);
      if (iso) {
        onChange(iso);
        setText(isoToDisplay(iso)); // normalize display
      } else {
        // Invalid date, revert to last valid value
        setText(isoToDisplay(value));
      }
    } else if (text.length === 0) {
      onChange('');
    } else {
      // Incomplete, revert
      setText(isoToDisplay(value));
    }
  }, [text, value, onChange]);

  const handleCalendarClick = useCallback(() => {
    hiddenRef.current?.showPicker?.();
    hiddenRef.current?.focus();
    hiddenRef.current?.click();
  }, []);

  const handleNativeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    onChange(iso);
    setText(isoToDisplay(iso));
    // Refocus the text input
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [onChange]);

  return (
    <div className={`date-input-wrap ${className || ''}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className="date-input-text"
        value={text}
        onChange={handleTextChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder || 'DD/MM/YYYY'}
        maxLength={10}
        autoComplete="off"
      />
      <button
        type="button"
        className="date-input-cal"
        onClick={handleCalendarClick}
        tabIndex={-1}
        aria-label="Pilih tanggal"
      >
        <i className="fa-regular fa-calendar"></i>
      </button>
      {/* Hidden native date picker for calendar fallback */}
      <input
        ref={hiddenRef}
        type="date"
        className="date-input-hidden"
        value={value}
        onChange={handleNativeChange}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
