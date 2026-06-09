import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Card, PageHeader, SectionHeader, Button, Badge, KpiCard,
  ToastList, useToasts, prettyError,
} from "../components/ToolUI";
import DataManager from "../components/DataManager";

const PALETTE = ["#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#22d3ee", "#f472b6", "#4ade80"];

// Compact summary sent to the AI insights endpoint (drops bulky histograms).
function buildSummary(d) {
  return {
    rows: d.rows,
    columns_count: d.columns_count,
    numeric_count: d.numeric_count,
    categorical_count: d.categorical_count,
    date_column: d.date_column,
    missing_total_pct: d.missing_total_pct,
    columns: d.columns,
    numeric_summary: (d.numeric_summary || []).map(({ histogram, ...rest }) => rest),
    categorical: d.categorical,
    correlations: d.correlations,
    time_series: d.time_series
      ? { date_column: d.time_series.date_column, frequency: d.time_series.frequency, series: d.time_series.series, points_count: d.time_series.points?.length }
      : null,
  };
}

function corrColor(v) {
  if (v == null) return "rgba(255,255,255,0.04)";
  // blue (neg) → neutral → purple (pos)
  const a = Math.min(1, Math.abs(v));
  return v >= 0 ? `rgba(167,139,250,${0.15 + 0.6 * a})` : `rgba(96,165,250,${0.15 + 0.6 * a})`;
}

export default function Insights() {
  const { toasts, toast, dismiss } = useToasts();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/dashboard");
      setData(res.data);
      setInsights("");
    } catch (err) {
      if (err?.response?.status === 404) setError("none");
      else setError(prettyError(err, "Couldn't load the dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateInsights = async () => {
    if (!data) return;
    setGenLoading(true);
    try {
      const res = await api.post("/api/insights", { summary: buildSummary(data) });
      setInsights(res.data?.insights || "No insights returned.");
    } catch (err) {
      toast.error(prettyError(err, "Couldn't generate insights."));
    } finally {
      setGenLoading(false);
    }
  };

  const numeric = data?.numeric_summary || [];
  const [activeHist, setActiveHist] = useState(0);
  const hist = numeric[activeHist];

  const ts = data?.time_series;
  const [activeSeries, setActiveSeries] = useState(null);
  const seriesKey = activeSeries || ts?.series?.[0];

  const tooltipStyle = useMemo(() => ({
    contentStyle: { background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" },
    labelStyle: { color: "#9ca3af" },
  }), []);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-12 max-w-7xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />
      <PageHeader
        eyebrow="Insights Dashboard"
        title="Understand your file at a glance"
        subtitle="Auto-generated trends, distributions, correlations, and an AI explanation of your active dataset."
        action={<Button variant="ghost" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>}
      />

      {/* Empty / error states */}
      {error === "none" && (
        <Card className="p-8 text-center mb-6">
          <h3 className="text-lg font-semibold text-white">No dataset yet</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
            Upload a CSV in the workspace (or activate one below), then come back to see your dashboard.
          </p>
          <div className="mt-5">
            <Link to="/analytics-workspace" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              Go to workspace to upload
            </Link>
          </div>
        </Card>
      )}
      {error && error !== "none" && (
        <Card className="p-6 mb-6">
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      )}

      {data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Rows" value={data.rows?.toLocaleString()} accent="blue" />
            <KpiCard label="Columns" value={data.columns_count} hint={`${data.numeric_count} numeric · ${data.categorical_count} categorical`} accent="purple" />
            <KpiCard label="Missing data" value={`${data.missing_total_pct ?? 0}%`} accent={data.missing_total_pct > 10 ? "amber" : "emerald"} />
            <KpiCard label="Time column" value={data.date_column || "—"} accent="emerald" />
          </div>

          {/* AI explanation */}
          <Card className="p-6 mb-6">
            <SectionHeader
              title="What this file shows"
              subtitle="Plain-language explanation generated from your data's profile."
              action={<Button variant="accent" onClick={generateInsights} loading={genLoading}>{insights ? "Regenerate" : "Explain this file"}</Button>}
            />
            {insights ? (
              <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{insights}</div>
            ) : (
              <p className="text-sm text-gray-500">Click <b className="text-gray-300">Explain this file</b> for an AI briefing — what the dataset is, key trends, data-quality notes, and which RINK tools fit.</p>
            )}
          </Card>

          {/* Time trend */}
          {ts && ts.points?.length > 1 && (
            <Card className="p-6 mb-6">
              <SectionHeader
                title="Trend over time"
                subtitle={`By ${ts.date_column}${ts.frequency && ts.frequency !== "unknown" ? ` · ${ts.frequency}` : ""}`}
                action={ts.series.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {ts.series.map((s, i) => (
                      <button key={s} onClick={() => setActiveSeries(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${seriesKey === s ? "bg-blue-500/20 border-blue-400/40 text-blue-100" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
              />
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ts.points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} minTickGap={32} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} width={48} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey={seriesKey} stroke="#60a5fa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Distribution + categorical side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {numeric.length > 0 && (
              <Card className="p-6">
                <SectionHeader
                  title="Distribution"
                  subtitle="Histogram of a numeric column"
                  action={numeric.length > 1 ? (
                    <select value={activeHist} onChange={(e) => setActiveHist(Number(e.target.value))}
                      className="bg-black/30 border border-white/10 rounded-lg text-sm text-white px-2 py-1.5 focus:outline-none">
                      {numeric.map((n, i) => <option key={n.column} value={i}>{n.column}</option>)}
                    </select>
                  ) : null}
                />
                {hist?.histogram?.length ? (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={hist.histogram} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="x" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} width={40} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="count" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 text-center">
                      {[["min", hist.min], ["median", hist.median], ["mean", hist.mean], ["max", hist.max], ["std", hist.std], ["count", hist.count]].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-white/[0.03] border border-white/10 py-2">
                          <div className="text-[10px] uppercase tracking-widest text-gray-500">{k}</div>
                          <div className="text-sm font-semibold text-white tabular-nums">{v ?? "—"}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-sm text-gray-500">No numeric columns to chart.</p>}
              </Card>
            )}

            {data.categorical?.length > 0 && (
              <Card className="p-6">
                <SectionHeader title="Top categories" subtitle={`Most frequent values in ${data.categorical[0].column}`} />
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart layout="vertical" data={data.categorical[0].values} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} width={110} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" fill="#a78bfa" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>

          {/* Correlations */}
          {data.correlations && data.correlations.columns.length >= 2 && (
            <Card className="p-6 mb-6">
              <SectionHeader title="Correlations" subtitle="How numeric columns move together (−1 to +1)" />
              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th className="p-2"></th>
                      {data.correlations.columns.map((c) => (
                        <th key={c} className="p-2 text-gray-400 font-medium text-left whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.correlations.matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 text-gray-400 font-medium whitespace-nowrap">{data.correlations.columns[i]}</td>
                        {row.map((v, j) => (
                          <td key={j} className="p-2 text-center text-white tabular-nums rounded" style={{ background: corrColor(v) }}>
                            {v == null ? "—" : v.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Column profile + preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <SectionHeader title="Columns" subtitle="Type, completeness, and uniqueness" />
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase tracking-wider">
                    <tr><th className="text-left py-2">Column</th><th className="text-left py-2">Type</th><th className="text-right py-2">Missing</th><th className="text-right py-2">Unique</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.columns.map((c) => (
                      <tr key={c.name}>
                        <td className="py-2 text-gray-200">{c.name}</td>
                        <td className="py-2"><Badge tone={c.kind === "numeric" ? "blue" : c.kind === "datetime" ? "emerald" : "purple"}>{c.kind}</Badge></td>
                        <td className="py-2 text-right text-gray-400 tabular-nums">{c.missing_pct}%</td>
                        <td className="py-2 text-right text-gray-400 tabular-nums">{c.unique?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <SectionHeader title="Data preview" subtitle="First rows of your file" />
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="text-xs">
                  <thead className="text-gray-500">
                    <tr>{Object.keys(data.preview?.[0] || {}).map((k) => <th key={k} className="text-left p-2 whitespace-nowrap">{k}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(data.preview || []).map((row, i) => (
                      <tr key={i}>{Object.values(row).map((v, j) => <td key={j} className="p-2 text-gray-300 whitespace-nowrap">{String(v)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Switch dataset */}
          <DataManager onActivated={load} compact />
        </>
      )}
    </div>
  );
}
