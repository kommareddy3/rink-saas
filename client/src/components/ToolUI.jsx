/**
 * Shared UI primitives used by the tool pages
 * (AnomalyDetection, ChurnPrediction, TSP, VRP).
 *
 * Patterns mirror Analytics.jsx but are exported so each tool page can stay
 * focused on its own logic.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Toast system
// ---------------------------------------------------------------------------

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const dismiss = useCallback(
    (id) => setToasts((p) => p.filter((t) => t.id !== id)),
    []
  );
  const push = useCallback((message, kind = "info", ttl = 4500) => {
    const id = ++idRef.current;
    setToasts((p) => [...p, { id, message, kind }]);
    if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    return id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toast = useMemo(
    () => ({
      info: (m, t) => push(m, "info", t),
      success: (m, t) => push(m, "success", t),
      error: (m, t) => push(m, "error", t ?? 7000),
    }),
    [push]
  );
  return { toasts, toast, dismiss };
}

export function ToastList({ toasts, dismiss }) {
  const palette = {
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    error: "border-red-400/40 bg-red-500/15 text-red-100",
    info: "border-blue-400/40 bg-blue-500/15 text-blue-100",
  };
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 ${palette[t.kind]}`}
        >
          <div className="flex-1 text-sm leading-snug">{t.message}</div>
          <button
            onClick={() => dismiss(t.id)}
            className="opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

export function Card({ className = "", children }) {
  return (
    <div className={`bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center flex-none">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function KpiCard({ label, value, hint, accent = "blue", icon, loading }) {
  const accents = {
    blue: "from-blue-500/20 to-blue-500/0 text-blue-300",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    purple: "from-purple-500/20 to-purple-500/0 text-purple-300",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300",
    red: "from-red-500/20 to-red-500/0 text-red-300",
  };
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br opacity-50 ${accents[accent] || accents.blue}`} />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">{label}</div>
          <div className="text-3xl font-bold text-white mt-2 tabular-nums truncate">
            {loading ? <Skeleton className="h-9 w-24 mt-1" /> : value}
          </div>
          {hint && <div className="text-xs text-gray-400 mt-2">{hint}</div>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${accents[accent]?.split(" ").pop() || "text-blue-300"}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`bg-white/10 rounded animate-pulse ${className}`} />;
}

export function Button({ variant = "primary", className = "", children, loading, ...props }) {
  const v = {
    primary: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20",
    accent: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/20",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20",
    ghost: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    danger: "bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-400/30",
  };
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${className}`}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-500/15 text-blue-200 border-blue-400/30",
    emerald: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
    purple: "bg-purple-500/15 text-purple-200 border-purple-400/30",
    amber: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    red: "bg-red-500/15 text-red-200 border-red-400/30",
    gray: "bg-white/5 text-gray-300 border-white/15",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider border rounded-md ${tones[tone]}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CSV drop zone (10 MB cap)
// ---------------------------------------------------------------------------

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function formatBytes(n) {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function DropZone({ file, onSelect, onClear, disabled, hint }) {
  const [hover, setHover] = useState(false);
  const inputRef = useRef(null);
  const validate = (f) => {
    if (!f) return null;
    const isCsv = f.name.toLowerCase().endsWith(".csv") || f.type === "text/csv";
    if (!isCsv) return `“${f.name}” isn't a .csv file.`;
    if (f.size > MAX_UPLOAD_BYTES) {
      return `File is ${formatBytes(f.size)} — limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
    }
    return null;
  };
  const accept = (f) => {
    const err = validate(f);
    if (err) return onSelect(null, err);
    onSelect(f, null);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        if (disabled) return;
        accept(e.dataTransfer.files?.[0]);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
      }}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all p-5 text-center
        ${hover ? "border-blue-400 bg-blue-500/10" : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
      {file ? (
        <div className="flex items-center justify-center gap-3 text-left">
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">{file.name}</div>
            <div className="text-xs text-gray-400">{formatBytes(file.size)}</div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Remove file"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          <div className="mx-auto w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 text-gray-300">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.9 5 5 0 119.74-1.5 4 4 0 011.14 7.4M12 12v8m0-8l-3 3m3-3l3 3" />
            </svg>
          </div>
          <div className="text-sm text-white font-medium">Drop CSV or click to browse</div>
          <div className="text-xs text-gray-400 mt-1">{hint || `Up to ${formatBytes(MAX_UPLOAD_BYTES)}`}</div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        {eyebrow && (
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-blue-300 font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="text-gray-400 mt-2 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pretty-print error from axios
// ---------------------------------------------------------------------------

export function prettyError(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data?.error) return data.error;
  if (data?.detail) {
    return Array.isArray(data.detail) ? JSON.stringify(data.detail) : data.detail;
  }
  if (err?.message) return err.message;
  return fallback;
}
