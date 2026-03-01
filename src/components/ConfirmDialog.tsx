// ============================================
// CONFIRM DIALOG — Reusable confirm/alert modal
// Replaces native window.confirm() with styled UI
// ============================================

import { useState, useCallback, useRef, useEffect, createContext, useContext, type ReactNode } from 'react';
import './ConfirmDialog.css';

// ===== TYPES =====
interface ConfirmOptions {
  title?: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: string; // FA icon class, e.g. 'fa-trash'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

// ===== HOOK =====
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

// ===== PROVIDER =====
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, options: { message: '' }, resolve: null });

  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(s => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(s => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  // Focus confirm button when opened
  useEffect(() => {
    if (state.open) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [state.open]);

  // Close on Escape
  useEffect(() => {
    if (!state.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.open, handleCancel]);

  const { options } = state;
  const variant = options.variant || 'danger';
  const icon = options.icon || (variant === 'danger' ? 'fa-trash-can' : variant === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info');

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="cd-overlay" onClick={handleCancel}>
          <div className={`cd-box cd-${variant}`} onClick={e => e.stopPropagation()}>
            <div className={`cd-icon cd-icon-${variant}`}>
              <i className={`fa-solid ${icon}`}></i>
            </div>
            {options.title && <h3 className="cd-title">{options.title}</h3>}
            <div className="cd-message">{options.message}</div>
            <div className="cd-actions">
              <button className="cd-btn cd-cancel" onClick={handleCancel}>
                {options.cancelText || 'Batal'}
              </button>
              <button
                ref={confirmBtnRef}
                className={`cd-btn cd-confirm cd-confirm-${variant}`}
                onClick={handleConfirm}
              >
                {options.confirmText || 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
