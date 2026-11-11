'use client';

import { AlertTriangle, CheckCircle2, OctagonAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { HAZARDS, LEVELS, type AlertLevel, type HazardCode } from '@saudi-shield/core';
import { useEffect, useState, type ReactNode } from 'react';

/** Independent abstract mark: concentric "received signal" arcs over a dot. No national symbols. */
export function Mark({ size = 32, light = false }: { size?: number; light?: boolean }) {
  const bg = light ? '#ffffff' : '#0e5e43';
  const fg = light ? '#0e5e43' : '#ffffff';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="11" fill={bg} />
      <circle cx="20" cy="26" r="3.2" fill={fg} />
      <path d="M13.5 21.5a9 9 0 0 1 13 0" stroke={fg} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M9.5 17.2a14.5 14.5 0 0 1 21 0" stroke={fg} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.75" />
      <path d="M5.8 13a20 20 0 0 1 28.4 0" stroke={fg} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function LevelChip({ level, lang = 'en' }: { level: AlertLevel; lang?: 'en' | 'ar' }) {
  const Icon = level === 'red' ? OctagonAlert : level === 'yellow' ? AlertTriangle : CheckCircle2;
  return (
    <span className={`chip ${level}`}>
      <Icon size={12} aria-hidden />
      {LEVELS[level].label[lang]}
    </span>
  );
}

export function HazardLabel({ hazard }: { hazard: HazardCode }) {
  return <span>{HAZARDS[hazard].en}</span>;
}

export function StateBadge({ state }: { state: string }) {
  return <span className={`state ${state}`}>{state.replace('_', ' ')}</span>;
}

export function ExerciseChip() {
  return <span className="chip exercise">EXERCISE · FICTIONAL</span>;
}

export function VerifyChip({ ok, code }: { ok: boolean; code: string }) {
  return ok ? (
    <span className="chip ok">
      <ShieldCheck size={12} aria-hidden /> Signature verified
    </span>
  ) : (
    <span className="chip bad">
      <ShieldX size={12} aria-hidden /> {code.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

export function Card({ title, sub, right, children, pad = true }: { title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; pad?: boolean }) {
  return (
    <section className="card">
      {title && (
        <header className="card-h">
          <h2>{title}</h2>
          {sub && <span className="sub">{sub}</span>}
          {right && <div className="right">{right}</div>}
        </header>
      )}
      {pad ? <div className="card-b">{children}</div> : children}
    </section>
  );
}

export function Kpi({ label, value, foot, icon }: { label: string; value: ReactNode; foot?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card kpi">
      <div className="kpi-label">
        {icon}
        {label}
      </div>
      <div className="kpi-value">{value}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  );
}

export function Confirm({
  title,
  children,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [pin, setPin] = useState('');
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <header className="card-h">
          <h2>{title}</h2>
        </header>
        <div className="card-b">
          {children}
          <label className="small muted">
            Re-enter your demo PIN to confirm (any 4 digits in this prototype)
            <input className="input" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus />
          </label>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className={`btn ${danger ? 'danger' : 'primary'}`} disabled={pin.length !== 4} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast ? (
    <div className={`toast ${toast.err ? 'err' : ''}`} role="status">
      {toast.msg}
    </div>
  ) : null;
  return { node, show: (msg: string, err = false) => setToast({ msg, err }) };
}
