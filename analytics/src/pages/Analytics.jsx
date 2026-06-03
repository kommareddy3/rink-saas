import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import {
  Area,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ReportStudio from "../components/ReportStudio";
import DataManager from "../components/DataManager";
import InfoTip from "../components/InfoTip";
import { csvFilename, exportCSV } from "../utils/csv";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — must match server limit
const MIN_PREDICT_VALUES = 7; // matches max(LAGS) in the ML service
const FETCH_LIMIT = 20000;    // ML API hard cap (so "All data" really means all)
const LS_KEY_COLUMN = "rink:selectedColumn";
const LS_KEY_RANGE = "rink:dateRange";
const DOCS_URL = "https://docs.rinkglobal.com";

const COLORS = {
  actual: "#60a5fa",
  actualFill: "#3b82f6",
  predicted: "#34d399",
  predictedFill: "#10b981",
  band: "#10b981",
  grid: "#1f2937",
  axis: "#9ca3af",
};

// Date-range presets (when a date column is present)
const DATE_RANGES = [
  { id: "90d", label: "90D", days: 90 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "5y", label: "5Y", days: 365 * 5 },
  { id: "all", label: "All", days: null },
];

// Count-based ranges (when no date column)
const COUNT_RANGES = [
  { id: "100", label: "100", count: 100 },
  { id: "500", label: "500", count: 500 },
  { id: "all", label: "All", count: null },
];

// ---------------------------------------------------------------------------
// Date / frequency helpers
// ---------------------------------------------------------------------------

const FREQ_LABELS = {
  daily: { unit: "day", units: "days" },
  weekly: { unit: "week", units: "weeks" },
  monthly: { unit: "month", units: "months" },
  quarterly: { unit: "quarter", units: "quarters" },
  yearly: { unit: "year", units: "years" },
  unknown: { unit: "step", units: "steps" },
};

function frequencyLabel(frequency) {
  return FREQ_LABELS[frequency] || { unit: "step", units: "steps" };
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function formatDateISO(d) {
  return d.toISOString().slice(0, 10);
}

function shortDate(iso) {
  if (!iso || typeof iso !== "string") return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function diffDays(isoLater, isoEarlier) {
  const a = new Date(isoLater).getTime();
  const b = new Date(isoEarlier).getTime();
  if (isNaN(a) || isNaN(b)) return Infinity;
  return (a - b) / 86400000;
}

// ---------------------------------------------------------------------------
// Toast system
// ---------------------------------------------------------------------------

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, kind = "info", ttl = 4500) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, kind }]);
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      info: (m, ttl) => push(m, "info", ttl),
      success: (m, ttl) => push(m, "success", ttl),
      error: (m, ttl) => push(m, "error", ttl ?? 7000),
    }),
    [push]
  );

  return { toasts, toast, dismiss };
}

function ToastList({ toasts, dismiss }) {
  const palette = {
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    error: "border-red-400/40 bg-red-500/15 text-red-100",
    info: "border-blue-400/40 bg-blue-500/15 text-blue-100",
  };
  const icon = {
    success: (
      <svg className="w-5 h-5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl animate-[slideIn_.2s_ease-out] ${palette[t.kind]}`}
        >
          {icon[t.kind]}
          <div className="flex-1 text-sm leading-snug">{t.message}</div>
          <button
            onClick={() => dismiss(t.id)}
            className="opacity-60 hover:opacity-100 -mr-1"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI primitives
// ---------------------------------------------------------------------------

function Card({ className = "", children }) {
  return (
    <div className={`bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, action }) {
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

function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-500/15 text-blue-200 border-blue-400/30",
    emerald: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
    purple: "bg-purple-500/15 text-purple-200 border-purple-400/30",
    amber: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    gray: "bg-white/5 text-gray-300 border-white/15",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider border rounded-md ${tones[tone]}`}>
      {children}
    </span>
  );
}

function KpiCard({ label, value, hint, accent, icon, loading, info }) {
  const accents = {
    blue: "from-blue-500/20 to-blue-500/0 text-blue-300",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    purple: "from-purple-500/20 to-purple-500/0 text-purple-300",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300",
  };
  return (
    <Card className="p-5 relative">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br opacity-50 ${accents[accent] || accents.blue}`} />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-gray-400 font-medium">
            <span className="truncate">{label}</span>
            {info && <InfoTip text={info} label={`What is ${label}?`} />}
          </div>
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

function Skeleton({ className = "" }) {
  return <div className={`bg-white/10 rounded animate-pulse ${className}`} />;
}

function Button({ variant = "primary", className = "", children, loading, ...props }) {
  const variants = {
    primary: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20",
    accent: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/20",
    ghost: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
  };
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
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

// Pill-button group used for column picker / date range / step selector.
function PillGroup({ options, value, onChange, disabled, tone = "purple", small }) {
  const tones = {
    blue: "bg-blue-500/30 border-blue-400/50 text-white",
    emerald: "bg-emerald-500/30 border-emerald-400/50 text-white",
    purple: "bg-purple-500/30 border-purple-400/50 text-white",
    amber: "bg-amber-500/30 border-amber-400/50 text-white",
  };
  const sizing = small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            className={`${sizing} rounded-lg font-medium border transition-all ${
              active ? tones[tone] : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={opt.title}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drop zone
// ---------------------------------------------------------------------------

function formatBytes(n) {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function DropZone({ file, onSelect, onClear, disabled }) {
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
    <div>
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
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all p-6 text-center
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
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-gray-300">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.9 5 5 0 119.74-1.5 4 4 0 011.14 7.4M12 12v8m0-8l-3 3m3-3l3 3" />
              </svg>
            </div>
            <div className="text-sm text-white font-medium">Drop CSV here, or click to browse</div>
            <div className="text-xs text-gray-400 mt-1">
              Up to {formatBytes(MAX_UPLOAD_BYTES)} · date column auto-detected · auto-trains on upload
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const label = row?.label ?? row?.name;
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 shadow-2xl text-sm min-w-[180px]">
      <div className="text-gray-400 text-xs mb-1.5 font-medium">{label}</div>
      {payload.map((p) => {
        if (p.value === null || p.value === undefined) return null;
        if (p.dataKey === "bandLow" || p.dataKey === "bandHigh") return null;
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-gray-300 capitalize">{p.name || p.dataKey}</span>
            </div>
            <span className="text-white font-semibold tabular-nums">
              {Number(p.value).toFixed(4)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Analytics() {
  const { toasts, toast, dismiss } = useToasts();

  // Forecast inputs
  const [file, setFile] = useState(null);
  const [valuesText, setValuesText] = useState("");
  const [steps, setSteps] = useState(10);
  const [predictions, setPredictions] = useState([]);
  const [splitIdx, setSplitIdx] = useState(null);

  // Server data
  const [actual, setActual] = useState([]);
  const [dates, setDates] = useState([]); // ISO strings parallel to actual
  const [column, setColumn] = useState("value");
  const [availableColumns, setAvailableColumns] = useState([]);
  const [dateColumn, setDateColumn] = useState(null);
  const [frequency, setFrequency] = useState("unknown");
  const [daysPerStep, setDaysPerStep] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activity, setActivity] = useState([]);

  // Schema analysis + training scope (panel group, custom window, excludes)
  const [analysis, setAnalysis] = useState(null);
  const [groupColumn, setGroupColumn] = useState(null);
  const [groupValue, setGroupValue] = useState(""); // "" = all groups combined
  const [trainStart, setTrainStart] = useState("");
  const [trainEnd, setTrainEnd] = useState("");
  const [excludeRanges, setExcludeRanges] = useState([]); // [[start, end], ...]
  const [featureColumns, setFeatureColumns] = useState([]); // multivariate predictors
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Chart range
  const [dateRange, setDateRange] = useState(() => {
    if (typeof window === "undefined") return "all";
    return localStorage.getItem(LS_KEY_RANGE) || "all";
  });

  // Loading flags
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const freq = frequencyLabel(frequency);

  const logActivity = useCallback((kind, message) => {
    setActivity((prev) => [{ kind, message, at: new Date() }, ...prev].slice(0, 8));
  }, []);

  // ---------------------------------------------------------------------------
  // Server interaction
  // ---------------------------------------------------------------------------

  // Build the query params / request body that describe the active training
  // scope (panel group, custom date window, excluded ranges).
  const scopeParams = useCallback(() => {
    const p = {};
    if (groupColumn && groupValue) {
      p.group_column = groupColumn;
      p.group_value = groupValue;
    }
    if (trainStart) p.train_start = trainStart;
    if (trainEnd) p.train_end = trainEnd;
    const ex = excludeRanges.filter((r) => r[0] && r[1]);
    if (ex.length) p.exclude = ex.map((r) => `${r[0]}:${r[1]}`).join(",");
    return p;
  }, [groupColumn, groupValue, trainStart, trainEnd, excludeRanges]);

  const scopeBody = useCallback(() => {
    const b = {};
    if (groupColumn && groupValue) {
      b.group_column = groupColumn;
      b.group_value = groupValue;
    }
    if (trainStart) b.train_start = trainStart;
    if (trainEnd) b.train_end = trainEnd;
    const ex = excludeRanges.filter((r) => r[0] && r[1]);
    if (ex.length) b.exclude_ranges = ex;
    // Multivariate predictors (drop the target if it slipped in).
    const feats = featureColumns.filter((c) => c && c !== column);
    if (feats.length) b.feature_columns = feats;
    return b;
  }, [groupColumn, groupValue, trainStart, trainEnd, excludeRanges, featureColumns, column]);

  const fetchData = useCallback(
    async (columnOverride, extraParams = {}) => {
      setIsLoadingData(true);
      try {
        const params = { limit: FETCH_LIMIT, ...extraParams };
        const wanted = columnOverride ?? localStorage.getItem(LS_KEY_COLUMN);
        if (wanted) params.column = wanted;
        const res = await api.get("/api/data", { params });
        const values = res.data.data || [];
        const ds = res.data.dates || [];
        setActual(values);
        setDates(ds);
        setColumn(res.data.column || "value");
        setAvailableColumns(res.data.available_columns || []);
        setDateColumn(res.data.date_column || null);
        setFrequency(res.data.frequency || "unknown");
        setDaysPerStep(res.data.days_per_step || null);
        if (res.data.column) {
          localStorage.setItem(LS_KEY_COLUMN, res.data.column);
        }
        if (values.length >= MIN_PREDICT_VALUES) {
          const want = Math.max(MIN_PREDICT_VALUES, steps);
          setValuesText(values.slice(-want).join(", "));
        }
        return res.data;
      } catch (err) {
        toast.error(prettyError(err, "Could not load dataset."));
        return null;
      } finally {
        setIsLoadingData(false);
      }
    },
    [toast, steps]
  );

  // Profile the dataset schema (date/value/group detection, panel check).
  // Best-effort: a failure here must not block the workspace.
  const runAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const res = await api.post("/api/analyze", {});
      setAnalysis(res.data);
      setGroupColumn(res.data.suggested_group_column || null);
      if (res.data.is_panel_data && Array.isArray(res.data.warnings)) {
        res.data.warnings.forEach((w) => toast.info(w, 7000));
      }
      return res.data;
    } catch {
      setAnalysis(null);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
    runAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY_RANGE, dateRange);
    }
  }, [dateRange]);

  // ---------------------------------------------------------------------------
  // Visible window (date-range filter)
  // ---------------------------------------------------------------------------

  const { visibleActual, visibleDates } = useMemo(() => {
    if (!actual.length) return { visibleActual: [], visibleDates: [] };

    // Date-based filtering (only when we actually have ISO dates)
    if (dates.length === actual.length && dateColumn) {
      const preset = DATE_RANGES.find((r) => r.id === dateRange) || DATE_RANGES[3];
      if (!preset.days) return { visibleActual: actual, visibleDates: dates };
      const lastIso = dates[dates.length - 1];
      const cutoff = preset.days;
      const startIdx = dates.findIndex((iso) => diffDays(lastIso, iso) <= cutoff);
      if (startIdx === -1) return { visibleActual: actual.slice(-1), visibleDates: dates.slice(-1) };
      return {
        visibleActual: actual.slice(startIdx),
        visibleDates: dates.slice(startIdx),
      };
    }

    // Count-based fallback
    const preset = COUNT_RANGES.find((r) => r.id === dateRange) || COUNT_RANGES[2];
    if (!preset.count) return { visibleActual: actual, visibleDates: dates };
    return {
      visibleActual: actual.slice(-preset.count),
      visibleDates: dates.slice(-preset.count),
    };
  }, [actual, dates, dateColumn, dateRange]);

  // ---------------------------------------------------------------------------
  // Chart data
  // ---------------------------------------------------------------------------

  const chartData = useMemo(() => {
    const rmse = metrics?.rmse ?? 0;
    const data = visibleActual.map((v, i) => ({
      name: i,
      label: visibleDates[i] ? shortDate(visibleDates[i]) : `${i}`,
      iso: visibleDates[i] || null,
      actual: v,
      predicted: null,
      bandLow: null,
      bandHigh: null,
    }));

    if (predictions.length && data.length) {
      const last = data.length - 1;
      data[last].predicted = data[last].actual;

      const lastIso = visibleDates[visibleDates.length - 1];
      const lastDate = lastIso ? new Date(lastIso) : null;
      const stepDays =
        daysPerStep || (frequency === "weekly" ? 7 : frequency === "monthly" ? 30 : 1);

      predictions.forEach((p, i) => {
        const widening = 1 + i * 0.25;
        let label;
        let iso = null;
        if (lastDate) {
          const future = addDays(lastDate, Math.round((i + 1) * stepDays));
          iso = formatDateISO(future);
          label = shortDate(iso);
        } else {
          label = `+${i + 1}`;
        }
        data.push({
          name: visibleActual.length + i,
          label,
          iso,
          actual: null,
          predicted: p,
          bandLow: p - rmse * widening,
          bandHigh: p + rmse * widening,
        });
      });
    }
    return data;
  }, [visibleActual, visibleDates, predictions, metrics, frequency, daysPerStep]);

  const forecastBars = useMemo(
    () =>
      predictions.map((p, i) => ({
        step: chartData[visibleActual.length + i]?.label || `+${i + 1}`,
        value: p,
      })),
    [predictions, chartData, visibleActual.length]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectFile = (f, errorMessage) => {
    if (errorMessage) {
      toast.error(errorMessage);
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a CSV file first.");
      return;
    }
    setIsUploading(true);
    const t = toast.info(`Uploading ${file.name}…`, 0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/upload", formData);
      dismiss(t);
      const trained = res.data?.training;
      setMetrics(trained || null);
      const msg = trained
        ? `Trained on ${trained.rows_used.toLocaleString()} rows · ${
            trained.frequency && trained.frequency !== "unknown" ? `${trained.frequency} cadence · ` : ""
          }RMSE ${trained.rmse.toFixed(4)} · MAE ${trained.mae.toFixed(4)}`
        : "Dataset uploaded and model trained.";
      toast.success(msg);
      logActivity("success", `Uploaded ${file.name} (${formatBytes(file.size)}) · re-trained`);
      setFile(null);
      setValuesText("");
      setPredictions([]);
      setSplitIdx(null);
      // New CSV may have different columns — clear stored selection + scope
      localStorage.removeItem(LS_KEY_COLUMN);
      setGroupValue("");
      setTrainStart("");
      setTrainEnd("");
      setExcludeRanges([]);
      setFeatureColumns([]);
      await fetchData();
      await runAnalyze();
    } catch (err) {
      dismiss(t);
      toast.error(prettyError(err, "Upload failed."));
      logActivity("error", `Upload failed: ${prettyError(err, "")}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Called after the user activates (switches to) a different stored dataset
  // from the data manager — refresh the workspace against the new data.
  const handleDatasetActivated = useCallback(async () => {
    setValuesText("");
    setPredictions([]);
    setSplitIdx(null);
    localStorage.removeItem(LS_KEY_COLUMN);
    setGroupValue("");
    setTrainStart("");
    setTrainEnd("");
    setExcludeRanges([]);
    setFeatureColumns([]);
    await fetchData();
    await runAnalyze();
    toast.success("Switched active dataset.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trainWithColumn = useCallback(
    async (colOverride, extraBody = {}) => {
      const body = { ...(colOverride ? { column: colOverride } : {}), ...extraBody };
      const res = await api.post("/api/train", body);
      setMetrics(res.data);
      return res.data;
    },
    []
  );

  const scopeSummary = () => {
    const parts = [];
    if (groupColumn && groupValue) parts.push(`${groupColumn} = ${groupValue}`);
    if (trainStart || trainEnd) parts.push(`${trainStart || "start"} → ${trainEnd || "end"}`);
    const ex = excludeRanges.filter((r) => r[0] && r[1]);
    if (ex.length) parts.push(`${ex.length} excluded`);
    return parts.length ? parts.join(" · ") : "all data";
  };

  const handleTrain = async () => {
    setIsTraining(true);
    const t = toast.info("Training model…", 0);
    try {
      const data = await trainWithColumn(column, scopeBody());
      dismiss(t);
      const msg = `Trained on ${data.rows_used.toLocaleString()} rows · column “${data.column}” · RMSE ${data.rmse.toFixed(
        4
      )} · MAE ${data.mae.toFixed(4)}`;
      toast.success(msg);
      logActivity("success", msg);
    } catch (err) {
      dismiss(t);
      toast.error(prettyError(err, "Training failed."));
    } finally {
      setIsTraining(false);
    }
  };

  // Re-fetch the chart series AND re-train, both honoring the active scope.
  const applyScope = async () => {
    setIsTraining(true);
    const t = toast.info("Applying scope & re-training…", 0);
    try {
      await fetchData(column, scopeParams());
      const data = await trainWithColumn(column, scopeBody());
      // Predictions from the previous scope are now stale.
      setPredictions([]);
      setSplitIdx(null);
      setValuesText("");
      dismiss(t);
      const msg = `Scope: ${scopeSummary()} · trained on ${data.rows_used.toLocaleString()} rows · RMSE ${data.rmse.toFixed(
        4
      )} · MAE ${data.mae.toFixed(4)}`;
      toast.success(msg);
      logActivity("success", msg);
    } catch (err) {
      dismiss(t);
      toast.error(prettyError(err, "Could not apply training scope."));
    } finally {
      setIsTraining(false);
    }
  };

  const resetScope = async () => {
    setGroupValue("");
    setTrainStart("");
    setTrainEnd("");
    setExcludeRanges([]);
    setIsTraining(true);
    const t = toast.info("Resetting to all data & re-training…", 0);
    try {
      await fetchData(column, {});
      const data = await trainWithColumn(column, {});
      setPredictions([]);
      setSplitIdx(null);
      setValuesText("");
      dismiss(t);
      toast.success(`Reset to all data · trained on ${data.rows_used.toLocaleString()} rows`);
      logActivity("info", "Training scope reset to all data");
    } catch (err) {
      dismiss(t);
      toast.error(prettyError(err, "Could not reset scope."));
    } finally {
      setIsTraining(false);
    }
  };

  const handleSwitchColumn = async (newCol) => {
    if (!newCol || newCol === column || isSwitching) return;
    setIsSwitching(true);
    const t = toast.info(`Switching to “${newCol}” and re-training…`, 0);
    try {
      // 1. Update local marker so subsequent fetches use it
      localStorage.setItem(LS_KEY_COLUMN, newCol);
      // A column can't be both target and predictor — drop it from features.
      setFeatureColumns((prev) => prev.filter((c) => c !== newCol));
      // 2. Refetch the series for the new column (honoring active scope)
      await fetchData(newCol, scopeParams());
      // 3. Re-train against it (honoring active scope)
      const data = await trainWithColumn(newCol, scopeBody());
      dismiss(t);
      // 4. Predictions from old column are now stale
      setPredictions([]);
      setSplitIdx(null);
      setValuesText("");
      const msg = `Switched to “${data.column}” · trained on ${data.rows_used.toLocaleString()} rows · RMSE ${data.rmse.toFixed(
        4
      )} · MAE ${data.mae.toFixed(4)}`;
      toast.success(msg);
      logActivity("success", msg);
    } catch (err) {
      dismiss(t);
      toast.error(prettyError(err, "Could not switch column."));
      // Roll back to whatever the server actually has
      await fetchData();
    } finally {
      setIsSwitching(false);
    }
  };

  const handlePredict = async () => {
    const arr = valuesText
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (arr.length < MIN_PREDICT_VALUES) {
      toast.error(`Enter at least ${MIN_PREDICT_VALUES} comma-separated numeric values.`);
      return;
    }
    setIsPredicting(true);
    try {
      const res = await api.post("/api/predict", { values: arr, steps });
      const ps = res.data.predictions || [];
      setPredictions(ps);
      setSplitIdx(visibleActual.length - 1);
      const horizon = `${ps.length} ${ps.length === 1 ? freq.unit : freq.units}`;
      toast.success(`Forecast generated · next ${horizon}`);
      logActivity("success", `Forecast: next ${horizon}`);
    } catch (err) {
      toast.error(prettyError(err, "Prediction failed."));
    } finally {
      setIsPredicting(false);
    }
  };

  const fillFromDataset = () => {
    if (actual.length < MIN_PREDICT_VALUES) {
      toast.error(`Not enough actual data — need at least ${MIN_PREDICT_VALUES} rows.`);
      return;
    }
    const want = Math.max(MIN_PREDICT_VALUES, steps);
    const slice = actual.slice(-want);
    setValuesText(slice.join(", "));
    const fromDate = dates[dates.length - slice.length];
    const toDate = dates[dates.length - 1];
    const range = fromDate && toDate ? ` (${shortDate(fromDate)} → ${shortDate(toDate)})` : "";
    toast.info(`Filled with most recent ${slice.length} values${range}.`);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasData = actual.length > 0;
  const lastDateLabel = dates[dates.length - 1] ? shortDate(dates[dates.length - 1]) : null;
  const report = useMemo(() => {
    if (!hasData || !metrics) return null;
    const lastActual = actual[actual.length - 1];
    const firstPrediction = predictions[0];
    const lastPrediction = predictions[predictions.length - 1];
    const forecastChange =
      predictions.length && Number.isFinite(firstPrediction) && Number.isFinite(lastPrediction)
        ? ((lastPrediction - firstPrediction) / Math.max(Math.abs(firstPrediction), 1)) * 100
        : null;
    return {
      title: "Forecasting Report",
      subtitle: `Forecast analysis for ${column} across ${actual.length.toLocaleString()} rows.`,
      summary: predictions.length
        ? `RINK trained a forecasting model on ${metrics.rows_used.toLocaleString()} rows for ${column} and generated ${predictions.length} ${predictions.length === 1 ? freq.unit : freq.units} of forecast output. The latest actual value is ${Number(lastActual).toFixed(3)}, the first forecast is ${Number(firstPrediction).toFixed(3)}, and validation error is RMSE ${metrics.rmse.toFixed(4)} / MAE ${metrics.mae.toFixed(4)}.`
        : `RINK trained a forecasting model on ${metrics.rows_used.toLocaleString()} rows for ${column}. The dataset contains ${actual.length.toLocaleString()} rows${frequency !== "unknown" ? ` at a ${frequency} cadence` : ""}, with validation error RMSE ${metrics.rmse.toFixed(4)} and MAE ${metrics.mae.toFixed(4)}. Generate a forecast to complete the client-ready outlook.`,
      metrics: [
        { label: "Dataset rows", value: actual.length.toLocaleString(), hint: `Column ${column}` },
        { label: "Rows used", value: metrics.rows_used.toLocaleString() },
        { label: "Cadence", value: frequency === "unknown" ? "Unknown" : frequency },
        { label: "RMSE", value: metrics.rmse.toFixed(4) },
        { label: "MAE", value: metrics.mae.toFixed(4) },
        { label: "Forecast steps", value: predictions.length || "Not generated" },
      ],
      charts: [
        "Actual vs forecast time-series chart.",
        "Forecast detail bar chart by future period.",
        "Confidence band using validation RMSE.",
        "Recent actual values table for source context.",
      ],
      insights: [
        `The selected forecast column is ${column}.`,
        frequency !== "unknown" ? `RINK detected a ${frequency} cadence${dateColumn ? ` from ${dateColumn}` : ""}.` : "No reliable date cadence was detected, so the horizon is interpreted as generic steps.",
        predictions.length && forecastChange != null ? `The forecast changes ${forecastChange >= 0 ? "up" : "down"} ${Math.abs(forecastChange).toFixed(1)}% across the generated horizon.` : "A forecast has not been generated yet for this trained model.",
        `Validation error is RMSE ${metrics.rmse.toFixed(4)} and MAE ${metrics.mae.toFixed(4)}.`,
      ],
      recommendations: [
        "Use the forecast chart in planning discussions and include the confidence band when presenting uncertainty.",
        "Review recent actual values for one-off events before committing to operational or financial targets.",
        "Re-train when new data is available or when switching to a different business metric.",
      ],
      slides: [
        { title: "Forecast Objective", detail: "Define the metric, data window, and planning horizon." },
        { title: "Trend and Outlook", detail: "Show actual history, forecast line, and uncertainty band." },
        { title: "Planning Implications", detail: "Translate the forecast into staffing, inventory, revenue, or operational action." },
      ],
    };
  }, [actual, column, dateColumn, freq.unit, freq.units, frequency, hasData, metrics, predictions]);

  // Range options for the chart action area
  const rangeOptions =
    dateColumn && dates.length === actual.length
      ? DATE_RANGES.map((r) => ({ value: r.id, label: r.label }))
      : COUNT_RANGES.map((r) => ({ value: r.id, label: r.label }));

  // Reconcile: if the active range is not in the active option set, fall back to "all"
  useEffect(() => {
    if (!rangeOptions.some((r) => r.value === dateRange)) {
      setDateRange("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateColumn]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-7xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-blue-300 font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Workspace
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Forecasting Workspace</h1>
          <p className="text-gray-400 mt-2 max-w-2xl">
            Upload time-series data — we auto-detect the date column, sort
            chronologically, and forecast the next horizon at the inferred cadence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${DOCS_URL}/guides/forecasting`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the docs in a new tab"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Help</span>
            <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <Button variant="ghost" onClick={() => fetchData()} loading={isLoadingData}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Dataset rows"
          info="How many data points are in the column you're forecasting, after sorting by date and dropping blanks."
          value={hasData ? actual.length.toLocaleString() : "—"}
          hint={
            hasData
              ? `Column “${column}”${lastDateLabel ? ` · latest ${lastDateLabel}` : ""}`
              : "Upload a dataset to begin"
          }
          accent="blue"
          loading={isLoadingData}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-9 0a2 2 0 002 2h6a2 2 0 002-2M5 7h14M5 11h14" />
            </svg>
          }
        />
        <KpiCard
          label="Cadence"
          info="How often your data points occur (daily, weekly, monthly…). RINK infers it from the typical gap between dates, and uses it to label and space future forecast points."
          value={frequency === "unknown" ? "—" : frequency}
          hint={
            dateColumn
              ? `Date column “${dateColumn}”`
              : hasData
              ? "No date column detected"
              : "Will infer from upload"
          }
          accent="emerald"
          loading={isLoadingData}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <KpiCard
          label="RMSE"
          info="Root Mean Squared Error — the typical size of the model's prediction error on held-out data, in your column's units. Lower is better; it penalises occasional large misses more heavily than MAE."
          value={metrics ? metrics.rmse.toFixed(4) : "—"}
          hint="Validation root mean-squared error"
          accent="purple"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l3-3 4 4 5-5" />
            </svg>
          }
        />
        <KpiCard
          label="MAE"
          info="Mean Absolute Error — the average size of the model's prediction error on held-out data, in your column's units. Lower is better; it's easier to read as “off by about this much on average”."
          value={metrics ? metrics.mae.toFixed(4) : "—"}
          hint="Validation mean absolute error"
          accent="purple"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          }
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Upload Dataset"
              subtitle="CSV with a numeric column"
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }
            />
            <DropZone
              file={file}
              onSelect={handleSelectFile}
              onClear={() => setFile(null)}
              disabled={isUploading}
            />
            <Button
              variant="primary"
              className="w-full mt-4"
              onClick={handleUpload}
              loading={isUploading}
              disabled={!file}
            >
              {isUploading ? "Uploading…" : "Upload & Train"}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
              <svg className="w-3.5 h-3.5 text-emerald-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Scanned &amp; encrypted at rest ·{" "}
              <a href="https://docs.rinkglobal.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200">
                how it&apos;s protected
              </a>
            </p>
          </Card>

          {/* Stored file library + saved reports */}
          <DataManager onActivated={handleDatasetActivated} compact />

          {/* Train + column picker */}
          <Card className="p-6">
            <SectionHeader
              title="Model"
              subtitle="Choose a column and train"
              icon={
                <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            />

            {/* Column picker */}
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-medium">
              Column to forecast
            </label>
            <ColumnPicker
              available={availableColumns}
              value={column}
              onChange={handleSwitchColumn}
              disabled={isSwitching || isTraining || !hasData}
            />
            {availableColumns.length > 1 && (
              <p className="text-[11px] text-gray-500 mt-1.5">
                Changing column refetches the data and re-trains automatically.
              </p>
            )}

            {/* Multivariate predictor columns */}
            {availableColumns.filter((c) => c !== column).length > 0 && (
              <div className="mt-5">
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-medium">
                  Predictor columns{" "}
                  <span className="normal-case tracking-normal text-gray-500">(optional · multivariate)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableColumns
                    .filter((c) => c !== column)
                    .map((c) => {
                      const on = featureColumns.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            setFeatureColumns((prev) =>
                              prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                            )
                          }
                          className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                            on
                              ? "bg-blue-500/20 border-blue-400/40 text-blue-200"
                              : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  {featureColumns.length
                    ? `Forecasting “${column}” with ${featureColumns.length} predictor${
                        featureColumns.length === 1 ? "" : "s"
                      }. Click Re-train to apply.`
                    : "Add columns whose history helps predict the target (e.g. spend → revenue)."}
                </p>
              </div>
            )}

            <div className="mt-5">
              <Button
                variant="success"
                className="w-full"
                onClick={handleTrain}
                loading={isTraining}
                disabled={!hasData || isSwitching}
              >
                {isTraining ? "Training…" : "Re-train Model"}
              </Button>
            </div>

            {metrics && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="text-gray-400">Rows used</div>
                  <div className="text-white text-lg font-semibold tabular-nums mt-0.5">
                    {metrics.rows_used.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="text-gray-400">Column</div>
                  <div className="text-white text-lg font-semibold mt-0.5 truncate">
                    {metrics.column}
                  </div>
                </div>
              </div>
            )}
            {metrics?.feature_columns?.length > 0 && (
              <p className="mt-3 text-[11px] text-blue-300/80">
                Multivariate · predictors: {metrics.feature_columns.join(", ")}
              </p>
            )}
          </Card>

          {/* Training scope: panel group, custom window, excluded ranges */}
          {hasData && (analysis?.is_panel_data || dateColumn) && (
            <Card className="p-6">
              <SectionHeader
                title="Training Scope"
                subtitle={`Currently: ${scopeSummary()}`}
                icon={
                  <svg className="w-5 h-5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                  </svg>
                }
              />

              {/* Group / ID picker (panel data only) */}
              {analysis?.is_panel_data && groupColumn && (
                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-medium">
                    Group ({groupColumn})
                  </label>
                  <select
                    value={groupValue}
                    onChange={(e) => setGroupValue(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">All groups (combined)</option>
                    {(analysis.group_values || []).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-amber-300/80 mt-1.5">
                    This dataset has multiple rows per date. Pick one group for a clean single series.
                  </p>
                </div>
              )}

              {/* Custom training window */}
              {dateColumn && (
                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-medium">
                    Training window
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={trainStart}
                      min={analysis?.date_min || undefined}
                      max={trainEnd || analysis?.date_max || undefined}
                      onChange={(e) => setTrainStart(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <input
                      type="date"
                      value={trainEnd}
                      min={trainStart || analysis?.date_min || undefined}
                      max={analysis?.date_max || undefined}
                      onChange={(e) => setTrainEnd(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  {(analysis?.date_min || analysis?.date_max) && (
                    <p className="text-[11px] text-gray-500 mt-1.5">
                      Data spans {analysis.date_min} → {analysis.date_max}. Leave blank to use all of it.
                    </p>
                  )}
                </div>
              )}

              {/* Exclude ranges */}
              {dateColumn && (
                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-medium">
                    Exclude ranges
                  </label>
                  {excludeRanges.length === 0 && (
                    <p className="text-[11px] text-gray-500 mb-2">
                      Drop noisy periods (e.g. an outage or a one-off spike) from training.
                    </p>
                  )}
                  <div className="space-y-2">
                    {excludeRanges.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="date"
                          value={r[0]}
                          onChange={(e) =>
                            setExcludeRanges((prev) =>
                              prev.map((x, i) => (i === idx ? [e.target.value, x[1]] : x))
                            )
                          }
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <span className="text-gray-500 text-xs">→</span>
                        <input
                          type="date"
                          value={r[1]}
                          onChange={(e) =>
                            setExcludeRanges((prev) =>
                              prev.map((x, i) => (i === idx ? [x[0], e.target.value] : x))
                            )
                          }
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => setExcludeRanges((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-400 transition p-1"
                          title="Remove range"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExcludeRanges((prev) => [...prev, ["", ""]])}
                    className="mt-2 text-xs text-blue-300 hover:text-blue-200 transition inline-flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add range
                  </button>
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={applyScope}
                  loading={isTraining}
                  disabled={isSwitching || isAnalyzing}
                >
                  Apply & Re-train
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetScope}
                  disabled={isTraining || isSwitching}
                >
                  Reset
                </Button>
              </div>
            </Card>
          )}

          {/* Predict */}
          <Card className="p-6">
            <SectionHeader
              title="Generate Forecast"
              subtitle={
                frequency === "unknown"
                  ? "Predict the next N steps"
                  : `Predict the next N ${freq.units}`
              }
              icon={
                <svg className="w-5 h-5 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
            <label className="flex items-center gap-1 text-xs uppercase tracking-wider text-gray-400 mb-2 font-medium">
              <span>Horizon</span>
              <InfoTip text="How many future points to forecast, at your data's cadence — e.g. 10 means the next 10 days for daily data, or 10 weeks for weekly data." label="What is Horizon?" />
            </label>
            <PillGroup
              tone="purple"
              value={steps}
              onChange={setSteps}
              options={[5, 10, 14, 30].map((n) => ({
                value: n,
                label: `${n} ${freq.units}`,
              }))}
            />
            {dateColumn && lastDateLabel && (
              <p className="text-xs text-gray-500 mt-1.5">
                Forecasting from {lastDateLabel} forward at {frequency} cadence.
              </p>
            )}

            <label className="flex items-center justify-between text-xs uppercase tracking-wider text-gray-400 mt-5 mb-2 font-medium">
              <span>Most recent values</span>
              <button
                onClick={fillFromDataset}
                className="text-blue-300 normal-case tracking-normal text-xs hover:text-blue-200"
                disabled={!hasData}
              >
                Use last {Math.max(MIN_PREDICT_VALUES, steps)}
              </button>
            </label>
            <textarea
              rows={3}
              placeholder="Most recent N values, oldest → newest, comma-separated"
              value={valuesText}
              onChange={(e) => setValuesText(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none text-sm font-mono"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Order matters: oldest first, most recent last. Need at least {MIN_PREDICT_VALUES}.
            </p>
            <Button
              variant="accent"
              className="w-full mt-4"
              onClick={handlePredict}
              loading={isPredicting}
              disabled={!metrics}
            >
              {isPredicting ? "Forecasting…" : `Generate ${steps}-${freq.unit} Forecast`}
            </Button>
            {!metrics && (
              <p className="text-xs text-amber-300/80 mt-3 flex items-start gap-1.5">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Train the model first to enable forecasting.
              </p>
            )}
          </Card>
        </div>

        {/* Visualizations column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main chart */}
          <Card className="p-6">
            <SectionHeader
              title="Time Series & Forecast"
              subtitle={
                hasData
                  ? `Column “${column}” · ${visibleActual.length.toLocaleString()} of ${actual.length.toLocaleString()} points shown${
                      predictions.length ? ` · ${predictions.length} forecast steps` : ""
                    }`
                  : "Upload a dataset to begin"
              }
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 5-5M14 7h6v6" />
                </svg>
              }
              action={
                hasData && (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {dateColumn && <Badge tone="emerald">{frequency}</Badge>}
                    <PillGroup
                      tone="blue"
                      value={dateRange}
                      onChange={setDateRange}
                      options={rangeOptions}
                      small
                    />
                  </div>
                )
              }
            />

            {hasData ? (
              <>
                <div className="hidden sm:flex items-center gap-4 mb-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 rounded" style={{ background: COLORS.actual }} />
                    Actual
                  </span>
                  {predictions.length > 0 && (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-1 rounded border-t-2 border-dashed" style={{ borderColor: COLORS.predicted }} />
                        Forecast
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-2 rounded" style={{ background: "rgba(16,185,129,0.18)" }} />
                        Confidence band (±RMSE)
                      </span>
                    </>
                  )}
                </div>
                <div className="w-full h-[360px] sm:h-[440px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.actualFill} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={COLORS.actualFill} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.band} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={COLORS.band} stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                      <XAxis
                        dataKey="label"
                        stroke={COLORS.axis}
                        tickLine={false}
                        axisLine={{ stroke: COLORS.grid }}
                        minTickGap={48}
                      />
                      <YAxis stroke={COLORS.axis} tickLine={false} axisLine={{ stroke: COLORS.grid }} width={50} />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: COLORS.axis, strokeDasharray: "3 3" }} />

                      {predictions.length > 0 && (
                        <>
                          <Area
                            type="monotone"
                            dataKey="bandHigh"
                            stroke="none"
                            fill="url(#bandFill)"
                            isAnimationActive={false}
                            connectNulls
                          />
                          <Area
                            type="monotone"
                            dataKey="bandLow"
                            stroke="none"
                            fill="#0b132b"
                            isAnimationActive={false}
                            connectNulls
                          />
                        </>
                      )}

                      <Area
                        type="monotone"
                        dataKey="actual"
                        name="Actual"
                        stroke={COLORS.actual}
                        strokeWidth={2}
                        fill="url(#actualFill)"
                        isAnimationActive={false}
                        connectNulls={false}
                      />

                      <Line
                        type="monotone"
                        dataKey="predicted"
                        name="Forecast"
                        stroke={COLORS.predicted}
                        strokeWidth={2.5}
                        strokeDasharray="6 4"
                        dot={{ fill: COLORS.predicted, r: 3 }}
                        isAnimationActive={false}
                        connectNulls={false}
                      />

                      {splitIdx !== null && predictions.length > 0 && chartData[splitIdx] && (
                        <ReferenceLine
                          x={chartData[splitIdx].label}
                          stroke="#a78bfa"
                          strokeDasharray="3 3"
                          label={{ value: "now", position: "top", fill: "#c4b5fd", fontSize: 11 }}
                        />
                      )}

                      {visibleActual.length > 30 && (
                        <Brush
                          dataKey="label"
                          height={24}
                          stroke="#374151"
                          fill="#0f172a"
                          travellerWidth={8}
                          startIndex={Math.max(0, chartData.length - 80)}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <EmptyState />
            )}
          </Card>

          {/* Forecast tiles + bars */}
          {predictions.length > 0 && (
            <Card className="p-6">
              <SectionHeader
                title="Forecast Detail"
                subtitle={`Next ${predictions.length} ${
                  predictions.length === 1 ? freq.unit : freq.units
                } with confidence widening over horizon`}
                icon={
                  <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                }
                action={
                  <ExportCsvButtons
                    onForecastOnly={() => handleExportForecast(predictions, chartData, visibleActual, metrics, column)}
                    onAllSeries={() => handleExportAllSeries(chartData, column, metrics)}
                  />
                }
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                {predictions.slice(0, 10).map((p, i) => {
                  const tile = chartData[visibleActual.length + i];
                  return (
                    <div
                      key={i}
                      className="relative overflow-hidden rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 p-3"
                    >
                      <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-semibold">
                        {tile?.label || `+${i + 1}`}
                      </div>
                      <div className="text-xl font-bold text-white tabular-nums mt-1">
                        {p.toFixed(3)}
                      </div>
                      {metrics && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          ±{(metrics.rmse * (1 + i * 0.25)).toFixed(3)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.predicted} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={COLORS.predicted} stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                    <XAxis
                      dataKey="step"
                      stroke={COLORS.axis}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      dy={6}
                      height={40}
                    />
                    <YAxis stroke={COLORS.axis} tickLine={false} axisLine={false} width={50} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="value" name="Forecast" fill="url(#barGrad)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Activity feed */}
          <Card className="p-6">
            <SectionHeader
              title="Recent Activity"
              subtitle="Last actions in this session"
              icon={
                <svg className="w-5 h-5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            {activity.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No actions yet. Upload a dataset, train, or run a forecast.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {activity.map((a, i) => (
                  <li key={i} className="py-2.5 flex items-start gap-3 text-sm">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full flex-none ${
                        a.kind === "success" ? "bg-emerald-400" : a.kind === "error" ? "bg-red-400" : "bg-blue-400"
                      }`}
                    />
                    <span className="flex-1 text-gray-200">{a.message}</span>
                    <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                      {a.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <ReportStudio report={report} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column picker — pills for ≤6 options, dropdown for more
// ---------------------------------------------------------------------------

function ColumnPicker({ available, value, onChange, disabled }) {
  if (!available || available.length === 0) {
    return <Skeleton className="h-9 w-full" />;
  }
  if (available.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300">
        <span className="text-gray-500">Only:</span>
        <span className="font-medium text-white truncate">{available[0]}</span>
      </div>
    );
  }
  if (available.length <= 6) {
    return (
      <PillGroup
        tone="emerald"
        value={value}
        onChange={onChange}
        disabled={disabled}
        options={available.map((c) => ({ value: c, label: c }))}
      />
    );
  }
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
    >
      {available.map((c) => (
        <option key={c} value={c} className="bg-gray-900">
          {c}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No data yet</h3>
      <p className="text-sm text-gray-400 max-w-sm mx-auto">
        Drop a CSV in the upload card on the left. Numeric columns will be detected
        and you can switch between them. If a date column is present, rows are
        sorted chronologically before training.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prettyError(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data?.error) return data.error;
  if (data?.detail) return Array.isArray(data.detail) ? JSON.stringify(data.detail) : data.detail;
  if (err?.message) return err.message;
  return fallback;
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

// Export just the forecast horizon: one row per predicted step with the
// confidence band (computed the same way as the chart).
function handleExportForecast(predictions, chartData, visibleActual, metrics, column) {
  if (!predictions?.length) return;
  const rmse = metrics?.rmse ?? 0;
  const rows = predictions.map((value, i) => {
    const tile = chartData[(visibleActual?.length || 0) + i] || {};
    const widening = 1 + i * 0.25;
    return {
      step: i + 1,
      date: tile.iso || "",
      label: tile.label || `+${i + 1}`,
      predicted: Number(value.toFixed(6)),
      lower: rmse ? Number((value - rmse * widening).toFixed(6)) : "",
      upper: rmse ? Number((value + rmse * widening).toFixed(6)) : "",
    };
  });
  exportCSV(csvFilename(`rink-forecast-${column || "series"}`), rows, {
    headers: [
      { key: "step",      label: "step" },
      { key: "date",      label: "date" },
      { key: "label",     label: "label" },
      { key: "predicted", label: `${column || "value"}_predicted` },
      { key: "lower",     label: "ci_low" },
      { key: "upper",     label: "ci_high" },
    ],
  });
}

// Export the entire visible chart: actual values + forecast in a single sheet
// so the user can rebuild the chart in Excel/Sheets.
function handleExportAllSeries(chartData, column, metrics) {
  if (!chartData?.length) return;
  const rmse = metrics?.rmse ?? 0;
  const rows = chartData.map((p) => ({
    index: p.name,
    date: p.iso || "",
    label: p.label,
    actual: p.actual ?? "",
    predicted: p.predicted ?? "",
    lower: p.bandLow ?? "",
    upper: p.bandHigh ?? "",
  }));
  exportCSV(csvFilename(`rink-series-${column || "data"}`), rows, {
    headers: [
      { key: "index",     label: "index" },
      { key: "date",      label: "date" },
      { key: "label",     label: "label" },
      { key: "actual",    label: `${column || "value"}_actual` },
      { key: "predicted", label: `${column || "value"}_predicted` },
      { key: "lower",     label: "ci_low" },
      { key: "upper",     label: "ci_high" },
    ],
  });
  // Suppress unused-var warning for rmse — referenced for future per-row banding.
  void rmse;
}

function ExportCsvButtons({ onForecastOnly, onAllSeries }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      <button
        type="button"
        onClick={onForecastOnly}
        title="Forecast steps only"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Forecast.csv
      </button>
      <button
        type="button"
        onClick={onAllSeries}
        title="Actuals + forecast in one file"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-9 0a2 2 0 002 2h6a2 2 0 002-2M5 7h14M5 11h14" />
        </svg>
        Full series.csv
      </button>
    </div>
  );
}
