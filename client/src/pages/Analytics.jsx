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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — must match server limit
const MIN_PREDICT_VALUES = 7; // matches max(LAGS) in the ML service

const COLORS = {
  actual: "#60a5fa",
  actualFill: "#3b82f6",
  predicted: "#34d399",
  predictedFill: "#10b981",
  band: "#10b981",
  grid: "#1f2937",
  axis: "#9ca3af",
};

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
  // "2026-05-08" → "May 8 '26"  (compact for chart ticks)
  if (!iso || typeof iso !== "string") return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
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
    <div
      className={`bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
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

function KpiCard({ label, value, hint, accent, icon, loading }) {
  const accents = {
    blue: "from-blue-500/20 to-blue-500/0 text-blue-300",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    purple: "from-purple-500/20 to-purple-500/0 text-purple-300",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300",
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
// Custom chart tooltip (date-aware)
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

  const [file, setFile] = useState(null);
  const [valuesText, setValuesText] = useState("");
  const [steps, setSteps] = useState(10);
  const [predictions, setPredictions] = useState([]);
  const [splitIdx, setSplitIdx] = useState(null);

  const [actual, setActual] = useState([]);
  const [dates, setDates] = useState([]); // ISO date strings parallel to actual
  const [column, setColumn] = useState("value");
  const [dateColumn, setDateColumn] = useState(null);
  const [frequency, setFrequency] = useState("unknown");
  const [daysPerStep, setDaysPerStep] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activity, setActivity] = useState([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);

  const freq = frequencyLabel(frequency);

  const logActivity = useCallback((kind, message) => {
    setActivity((prev) => [{ kind, message, at: new Date() }, ...prev].slice(0, 8));
  }, []);

  // Pre-fill the input with the most recent N values, where
  // N = max(steps, MIN_PREDICT_VALUES). Always uses the *chronologically last*
  // values (the API has already sorted ascending by date if available).
  const computeFillValues = useCallback(
    (n) => {
      const want = Math.max(MIN_PREDICT_VALUES, n);
      const slice = actual.slice(-want);
      return slice;
    },
    [actual]
  );

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const res = await api.get("/api/data", { params: { limit: 500 } });
      const values = res.data.data || [];
      const ds = res.data.dates || [];
      setActual(values);
      setDates(ds);
      setColumn(res.data.column || "value");
      setDateColumn(res.data.date_column || null);
      setFrequency(res.data.frequency || "unknown");
      setDaysPerStep(res.data.days_per_step || null);
      // Auto-fill prediction input with most recent values
      if (values.length >= MIN_PREDICT_VALUES) {
        const want = Math.max(MIN_PREDICT_VALUES, steps);
        setValuesText(values.slice(-want).join(", "));
      }
    } catch (err) {
      toast.error(prettyError(err, "Could not load dataset."));
    } finally {
      setIsLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fill input when steps changes (if data loaded and user hasn't typed something custom)
  useEffect(() => {
    if (!actual.length) return;
    const fill = computeFillValues(steps).join(", ");
    setValuesText((prev) => (prev === "" ? fill : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual]);

  // --- chart data with date labels and confidence band ----------------------
  const chartData = useMemo(() => {
    const rmse = metrics?.rmse ?? 0;

    const data = actual.map((v, i) => ({
      name: i,
      label: dates[i] ? shortDate(dates[i]) : `${i}`,
      iso: dates[i] || null,
      actual: v,
      predicted: null,
      bandLow: null,
      bandHigh: null,
    }));

    if (predictions.length && data.length) {
      const last = data.length - 1;
      data[last].predicted = data[last].actual; // bridge

      const lastIso = dates[dates.length - 1];
      const lastDate = lastIso ? new Date(lastIso) : null;
      const stepDays = daysPerStep || (frequency === "weekly" ? 7 : frequency === "monthly" ? 30 : 1);

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
          name: actual.length + i,
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
  }, [actual, dates, predictions, metrics, frequency, daysPerStep]);

  const forecastBars = useMemo(
    () =>
      predictions.map((p, i) => ({
        step: chartData[actual.length + i]?.label || `+${i + 1}`,
        value: p,
      })),
    [predictions, chartData, actual.length]
  );

  // ---------------------------------------------------------------------------
  // Actions
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
      // Reset input so it auto-refills from the new dataset
      setValuesText("");
      await fetchData();
    } catch (err) {
      dismiss(t);
      toast.error(prettyError(err, "Upload failed."));
      logActivity("error", `Upload failed: ${prettyError(err, "")}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTrain = async () => {
    setIsTraining(true);
    const t = toast.info("Training model…", 0);
    try {
      const res = await api.post("/api/train");
      dismiss(t);
      setMetrics(res.data);
      const msg = `Trained on ${res.data.rows_used.toLocaleString()} rows · RMSE ${res.data.rmse.toFixed(
        4
      )} · MAE ${res.data.mae.toFixed(4)}`;
      toast.success(msg);
      logActivity("success", msg);
    } catch (err) {
      dismiss(t);
      toast.error(prettyError(err, "Training failed."));
    } finally {
      setIsTraining(false);
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
      setSplitIdx(actual.length - 1);
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
    const slice = computeFillValues(steps);
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
        <Button variant="ghost" onClick={fetchData} loading={isLoadingData}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh data
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Dataset rows"
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
          </Card>

          <Card className="p-6">
            <SectionHeader
              title="Re-train Model"
              subtitle="Run on the current dataset"
              icon={
                <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            />
            <Button
              variant="success"
              className="w-full"
              onClick={handleTrain}
              loading={isTraining}
              disabled={!hasData}
            >
              {isTraining ? "Training…" : "Train Model"}
            </Button>
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
          </Card>

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
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-medium">
              Horizon
            </label>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {[5, 10, 14, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setSteps(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    steps === n
                      ? "bg-purple-500/30 border-purple-400/50 text-white"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {n} {freq.units}
                </button>
              ))}
            </div>
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
              {isPredicting
                ? "Forecasting…"
                : `Generate ${steps}-${freq.unit} Forecast`}
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
                  ? `Column “${column}” · ${actual.length.toLocaleString()} actual points${
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
                    <span className="hidden sm:flex items-center gap-1.5 text-xs">
                      <span className="w-3 h-1 rounded" style={{ background: COLORS.actual }} />
                      <span className="text-gray-300">Actual</span>
                    </span>
                    {predictions.length > 0 && (
                      <span className="hidden sm:flex items-center gap-1.5 text-xs">
                        <span className="w-3 h-1 rounded border-t-2 border-dashed" style={{ borderColor: COLORS.predicted }} />
                        <span className="text-gray-300">Forecast</span>
                      </span>
                    )}
                  </div>
                )
              }
            />

            {hasData ? (
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

                    {splitIdx !== null && predictions.length > 0 && (
                      <ReferenceLine
                        x={chartData[splitIdx]?.label}
                        stroke="#a78bfa"
                        strokeDasharray="3 3"
                        label={{ value: "now", position: "top", fill: "#c4b5fd", fontSize: 11 }}
                      />
                    )}

                    {actual.length > 30 && (
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
            ) : (
              <EmptyState />
            )}
          </Card>

          {/* Forecast bars + tiles */}
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
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                {predictions.slice(0, 10).map((p, i) => {
                  const tile = chartData[actual.length + i];
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
                    <XAxis dataKey="step" stroke={COLORS.axis} tickLine={false} axisLine={false} interval={0} angle={-15} dy={6} height={40} />
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
        </div>
      </div>
    </div>
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
        Drop a CSV in the upload card on the left. The first numeric column will
        be detected automatically. If a date column is present, rows are sorted
        chronologically before training.
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
