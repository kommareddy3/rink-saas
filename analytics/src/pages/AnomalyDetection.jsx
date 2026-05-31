import React, { useMemo, useState } from "react";
import {
  Badge, Button, Card, DropZone, KpiCard, PageHeader,
  SectionHeader, Skeleton, ToastList, prettyError, useToasts,
} from "../components/ToolUI";
import {
  Area, CartesianGrid, ComposedChart, ResponsiveContainer,
  Scatter, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../api";
import ReportStudio from "../components/ReportStudio";
import InfoTip from "../components/InfoTip";

const COLORS = {
  actual: "#60a5fa",
  actualFill: "#3b82f6",
  anomaly: "#f87171",
  grid: "#1f2937",
  axis: "#9ca3af",
};

function shortDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 shadow-2xl text-sm min-w-[180px]">
      <div className="text-gray-400 text-xs mb-1.5">{row.label || row.index}</div>
      <div className="flex items-center justify-between gap-4 text-white">
        <span className="text-gray-300">Value</span>
        <span className="font-semibold tabular-nums">{Number(row.value).toFixed(4)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-white">
        <span className="text-gray-300">Anomaly score</span>
        <span className="font-semibold tabular-nums">{Number(row.score).toFixed(3)}</span>
      </div>
      {row.is_anomaly && (
        <div className="mt-1 text-xs text-red-300 font-medium">⚠ Flagged as anomaly</div>
      )}
    </div>
  );
}

export default function AnomalyDetection() {
  const { toasts, toast, dismiss } = useToasts();
  const [file, setFile] = useState(null);
  const [column, setColumn] = useState("");
  const [contamination, setContamination] = useState(5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const chartData = useMemo(() => {
    if (!result?.points) return [];
    return result.points.map((p) => ({
      ...p,
      label: p.date ? shortDate(p.date) : `#${p.index}`,
      anomValue: p.is_anomaly ? p.value : null,
    }));
  }, [result]);

  const handleSelect = (f, errorMessage) => {
    if (errorMessage) { toast.error(errorMessage); setFile(null); return; }
    setFile(f); setResult(null);
  };

  const run = async () => {
    if (!file) return toast.error("Choose a CSV first.");
    setRunning(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (column.trim()) fd.append("column", column.trim());
      fd.append("contamination", String(contamination / 100));
      const res = await api.post("/api/anomaly/detect", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      toast.success(`Detected ${res.data.anomalies} anomalies in ${res.data.rows} rows.`);
    } catch (err) {
      toast.error(prettyError(err, "Anomaly detection failed."));
    } finally {
      setRunning(false);
    }
  };

  const anomalousPoints = result?.points?.filter((p) => p.is_anomaly) || [];
  const report = useMemo(() => {
    if (!result) return null;
    const top = [...anomalousPoints].sort((a, b) => b.score - a.score)[0];
    return {
      title: "Anomaly Detection Report",
      subtitle: `Outlier review for ${result.column} across ${result.rows.toLocaleString()} rows.`,
      summary: `RINK analyzed ${result.rows.toLocaleString()} rows in ${result.column} and flagged ${result.anomalies.toLocaleString()} anomalies (${(result.anomaly_rate * 100).toFixed(2)}%). The configured expected anomaly rate was ${(result.contamination * 100).toFixed(1)}%, and the anomaly threshold score was ${result.threshold.toFixed(4)}.`,
      metrics: [
        { label: "Rows analyzed", value: result.rows.toLocaleString() },
        { label: "Anomalies", value: result.anomalies.toLocaleString() },
        { label: "Anomaly rate", value: `${(result.anomaly_rate * 100).toFixed(2)}%` },
        { label: "Cadence", value: result.frequency || "Unknown" },
        { label: "Threshold", value: result.threshold.toFixed(4) },
        { label: "Column", value: result.column },
      ],
      charts: [
        "Time-series line chart with flagged anomalies highlighted in red.",
        "Top anomalies table ranked by anomaly score.",
        "Anomaly score distribution for validation and threshold review.",
      ],
      insights: [
        `${result.anomalies.toLocaleString()} rows deserve investigation before decisions are made from this dataset.`,
        top ? `The highest-scoring anomaly is row ${top.index}${top.date ? ` on ${top.date}` : ""} with value ${top.value.toFixed(4)}.` : "No anomalies were flagged under the current threshold.",
        result.date_column ? `A date column (${result.date_column}) was detected, so the review can be tied to business timing.` : "No date column was detected, so anomalies are indexed by row order.",
      ],
      recommendations: [
        "Review the top anomaly rows against known events, data-entry issues, outages, promotions, or operational changes.",
        "Re-run with a lower expected anomaly rate for stricter exception reporting if too many points are flagged.",
        "Create a follow-up investigation list for rows with the highest anomaly scores.",
      ],
      slides: [
        { title: "Exception Summary", detail: "Show rows analyzed, anomaly count, anomaly rate, and threshold." },
        { title: "Visual Trend Review", detail: "Present the time-series chart with red anomaly markers." },
        { title: "Top Exceptions", detail: "Rank the highest-scoring anomalies and assign investigation owners." },
      ],
    };
  }, [anomalousPoints, result]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-7xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />
      <PageHeader
        eyebrow="Anomaly Detection"
        title="Find unusual patterns in your data"
        subtitle="Upload a time-series CSV and let an Isolation Forest flag rows that look out of distribution — useful for fraud, sensor errors, or surprising business events."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Rows analyzed"
          info="How many rows from your file were scored by the detector (after dropping blanks in the value column)."
          value={result ? result.rows.toLocaleString() : "—"}
          accent="blue"
        />
        <KpiCard
          label="Anomalies"
          info="How many rows were flagged as unusual — points that don't fit the pattern of the rest of your data."
          value={result ? result.anomalies.toLocaleString() : "—"}
          accent="red"
        />
        <KpiCard
          label="Anomaly rate"
          info="Share of rows flagged as anomalies (anomalies ÷ rows analysed). It lands near the expected rate you set with contamination."
          value={result ? `${(result.anomaly_rate * 100).toFixed(2)}%` : "—"}
          accent="amber"
        />
        <KpiCard
          label="Cadence"
          info="How often your data points occur (daily, weekly, monthly…), inferred from the gaps between dates."
          value={result?.frequency || "—"}
          hint={result?.date_column ? `Date column "${result.date_column}"` : "No date column"}
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Dataset"
              subtitle="One numeric column to score; date column optional but recommended."
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }
            />
            <DropZone file={file} onSelect={handleSelect} onClear={() => setFile(null)} disabled={running} />
            <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mt-4 mb-1.5">
              Value column (optional)
            </label>
            <input
              type="text"
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              placeholder="auto-detect"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />

            <label className="flex items-center gap-1 text-xs uppercase tracking-wider text-gray-300 font-semibold mt-4 mb-1.5">
              <span>Expected anomaly rate: <span className="text-white">{contamination}%</span></span>
              <InfoTip text="The share of rows you expect to be unusual (also called “contamination”). It tunes how aggressively the detector flags points — higher means more rows get flagged." label="What is the expected anomaly rate?" />
            </label>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={contamination}
              onChange={(e) => setContamination(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              How frequently anomalies are expected in your data. Lower = stricter.
            </p>

            <Button variant="primary" className="w-full mt-5" onClick={run} loading={running} disabled={!file}>
              {running ? "Analyzing…" : "Detect anomalies"}
            </Button>
          </Card>

          {result && (
            <Card className="p-6">
              <SectionHeader
                title="What was scored?"
                subtitle="Snapshot of the run."
                icon={<Badge tone="emerald">Done</Badge>}
              />
              <dl className="text-sm space-y-2">
                <div className="flex justify-between"><dt className="text-gray-400">Value column</dt><dd className="text-white">{result.column}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-400">Date column</dt><dd className="text-white">{result.date_column || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-400">Threshold score</dt><dd className="text-white tabular-nums">{result.threshold.toFixed(4)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-400">Method</dt><dd className="text-white">IsolationForest</dd></div>
              </dl>
            </Card>
          )}
        </div>

        {/* Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Series with anomalies highlighted"
              subtitle={result ? `${result.column} — red dots are flagged rows` : "Run a detection to populate the chart"}
              icon={
                <svg className="w-5 h-5 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
              }
            />
            {chartData.length === 0 ? (
              <div className="text-center py-12 text-gray-500 italic">Upload a CSV and click Detect to see results.</div>
            ) : (
              <div className="w-full h-[360px] sm:h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="anomFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.actualFill} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={COLORS.actualFill} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="label" stroke={COLORS.axis} tickLine={false} axisLine={{ stroke: COLORS.grid }} minTickGap={40} />
                    <YAxis stroke={COLORS.axis} tickLine={false} axisLine={{ stroke: COLORS.grid }} width={50} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: COLORS.axis, strokeDasharray: "3 3" }} />
                    <Area type="monotone" dataKey="value" stroke={COLORS.actual} strokeWidth={2} fill="url(#anomFill)" isAnimationActive={false} />
                    <Scatter dataKey="anomValue" fill={COLORS.anomaly} shape="circle" r={5} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {anomalousPoints.length > 0 && (
            <Card className="p-6">
              <SectionHeader
                title="Top anomalies"
                subtitle={`${anomalousPoints.length} flagged rows ranked by anomaly score`}
                icon={<Badge tone="red">{anomalousPoints.length}</Badge>}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-2 pr-3">Row</th>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3 text-right">Value</th>
                      <th className="py-2 pr-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...anomalousPoints].sort((a, b) => b.score - a.score).slice(0, 20).map((p) => (
                      <tr key={p.index} className="text-gray-200">
                        <td className="py-2 pr-3 tabular-nums">{p.index}</td>
                        <td className="py-2 pr-3">{p.date ? shortDate(p.date) : "—"}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{p.value.toFixed(4)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-red-300">{p.score.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-6">
        <ReportStudio report={report} />
      </div>
    </div>
  );
}
