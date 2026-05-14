import React, { useMemo, useState } from "react";
import {
  Badge, Button, Card, DropZone, KpiCard, PageHeader,
  SectionHeader, ToastList, prettyError, useToasts,
} from "../components/ToolUI";
import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import api from "../api";
import ReportStudio from "../components/ReportStudio";

// Visually distinct cluster palette — supports up to 12 clusters.
const PALETTE = [
  "#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#22d3ee",
  "#fb7185", "#84cc16", "#f97316", "#ec4899", "#14b8a6", "#facc15",
];

const COLORS = { grid: "#1f2937", axis: "#9ca3af" };

export default function CustomerSegmentation() {
  const { toasts, toast, dismiss } = useToasts();
  const [file, setFile] = useState(null);
  const [features, setFeatures] = useState("");
  const [autoK, setAutoK] = useState(true);
  const [k, setK] = useState(4);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

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
      if (features.trim()) fd.append("features", features.trim());
      if (!autoK) fd.append("k", String(k));
      const res = await api.post("/api/segmentation/run", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      toast.success(
        `Found ${res.data.n_clusters} segments across ${res.data.rows.toLocaleString()} rows · silhouette ${res.data.silhouette?.toFixed(3) ?? "n/a"}.`
      );
    } catch (err) {
      toast.error(prettyError(err, "Segmentation failed."));
    } finally {
      setRunning(false);
    }
  };

  // Group points by cluster so Recharts can render one Scatter per cluster
  // (gives us the colour-coded scatter plot).
  const seriesByCluster = useMemo(() => {
    if (!result) return [];
    const groups = {};
    for (const p of result.points) {
      (groups[p.cluster] = groups[p.cluster] || []).push(p);
    }
    return result.clusters.map((c) => ({
      cluster: c,
      data: groups[c.id] || [],
      color: PALETTE[c.id % PALETTE.length],
    }));
  }, [result]);
  const report = useMemo(() => {
    if (!result) return null;
    const largest = [...result.clusters].sort((a, b) => b.size - a.size)[0];
    const smallest = [...result.clusters].sort((a, b) => a.size - b.size)[0];
    return {
      title: "Customer Segmentation Report",
      subtitle: `Segment profile analysis across ${result.rows.toLocaleString()} rows.`,
      summary: `RINK identified ${result.n_clusters} customer segments across ${result.rows.toLocaleString()} rows using ${result.features_used.length} feature columns. The largest segment contains ${largest?.size.toLocaleString()} customers (${((largest?.pct || 0) * 100).toFixed(1)}%), and the model${result.auto_k ? " automatically selected the segment count" : " used the manually selected segment count"}.`,
      metrics: [
        { label: "Rows", value: result.rows.toLocaleString() },
        { label: "Segments", value: result.n_clusters },
        { label: "Silhouette", value: result.silhouette != null ? result.silhouette.toFixed(3) : "N/A", hint: "Higher means cleaner separation" },
        { label: "Features used", value: result.features_used.length },
        { label: "Largest segment", value: largest ? largest.size.toLocaleString() : "N/A" },
        { label: "Smallest segment", value: smallest ? smallest.size.toLocaleString() : "N/A" },
      ],
      charts: [
        "PCA segment map with each customer colored by assigned segment.",
        "Segment size distribution chart.",
        "Segment profile cards showing centroid values in original units.",
      ],
      insights: [
        `${result.n_clusters} distinct customer groups are visible in the selected feature space.`,
        largest ? `Segment ${largest.id + 1} is the largest group and represents ${((largest.pct || 0) * 100).toFixed(1)}% of the dataset.` : "Segment sizes should be reviewed before campaign planning.",
        `The clustering used ${result.features_used.slice(0, 5).join(", ")}${result.features_used.length > 5 ? ", and more" : ""}.`,
        result.silhouette != null ? `Silhouette score is ${result.silhouette.toFixed(3)}, which helps judge separation quality.` : "Silhouette score was not available for this run.",
      ],
      recommendations: [
        "Name each segment in business language and validate the profile with sales, success, or operations teams.",
        "Create separate outreach, pricing, support, or retention strategies for the highest-value segments.",
        "Re-run segmentation with curated features if the groups do not map cleanly to business actions.",
      ],
      slides: [
        { title: "Segment Landscape", detail: "Show the number of groups, rows analyzed, and quality score." },
        { title: "Who Is In Each Segment", detail: "Present segment sizes and top centroid characteristics." },
        { title: "How To Act", detail: "Translate segments into campaigns, tiers, or operational next steps." },
      ],
    };
  }, [result]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-7xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />
      <PageHeader
        eyebrow="Customer Segmentation"
        title="Find natural groups in your customer data"
        subtitle="K-means clustering with auto-tuned k and PCA projection. Drop a customer table — RINK picks the features, normalises them, and finds groups."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Customers" value={result ? result.rows.toLocaleString() : "—"} accent="blue" />
        <KpiCard
          label="Segments"
          value={result ? result.n_clusters : "—"}
          hint={result?.auto_k ? "Picked by silhouette" : "Manually set"}
          accent="purple"
        />
        <KpiCard
          label="Silhouette"
          value={result?.silhouette != null ? result.silhouette.toFixed(3) : "—"}
          accent="emerald"
          hint="Higher = better-separated"
        />
        <KpiCard
          label="Features used"
          value={result ? result.features_used.length : "—"}
          accent="amber"
          hint={result?.features_used.slice(0, 2).join(", ") || ""}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Customer table"
              subtitle="One row per customer; numeric features will be used by default."
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <DropZone file={file} onSelect={handleSelect} onClear={() => setFile(null)} disabled={running} />

            <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mt-4 mb-1.5">
              Feature columns (optional)
            </label>
            <input
              type="text"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="auto-detect numerics"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Comma-separated. e.g. <code>recency, spend, tenure</code>. Leave blank to use all numerics.
            </p>

            <div className="mt-5">
              <label className="flex items-center gap-2 text-sm text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={autoK}
                  onChange={(e) => setAutoK(e.target.checked)}
                  className="accent-blue-500"
                />
                Auto-pick the number of segments
              </label>
              {!autoK && (
                <div className="mt-3">
                  <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
                    Number of segments: <span className="text-white">{k}</span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="1"
                    value={k}
                    onChange={(e) => setK(parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </div>

            <Button variant="primary" className="w-full mt-5" onClick={run} loading={running} disabled={!file}>
              {running ? "Clustering…" : "Find segments"}
            </Button>
          </Card>

          {result && (
            <Card className="p-6">
              <SectionHeader title="Snapshot" />
              <dl className="text-sm space-y-2">
                <Row label="K (segments)" value={result.n_clusters} />
                <Row label="Source" value={result.auto_k ? "Auto" : "Manual"} />
                <Row label="Silhouette" value={result.silhouette?.toFixed(3) ?? "—"} />
                <Row label="Inertia" value={result.inertia.toFixed(1)} />
              </dl>
              <p className="text-[11px] text-gray-500 mt-3">
                Silhouette is a quality score from −1 to 1. Above 0.3 generally
                means meaningful structure exists.
              </p>
            </Card>
          )}
        </div>

        {/* Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          {/* PCA scatter */}
          <Card className="p-6">
            <SectionHeader
              title="Segment map"
              subtitle={result ? "PCA projection of feature space — points coloured by segment" : "Run a clustering to populate the chart"}
            />
            {!result ? (
              <div className="text-center py-12 text-gray-500 italic">Upload a CSV and click Find segments.</div>
            ) : (
              <>
                <div className="w-full h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                      <XAxis dataKey="x" type="number" stroke={COLORS.axis} tickLine={false} axisLine={{ stroke: COLORS.grid }} name="PC1" />
                      <YAxis dataKey="y" type="number" stroke={COLORS.axis} tickLine={false} axisLine={{ stroke: COLORS.grid }} name="PC2" />
                      <ZAxis range={[36, 36]} />
                      <Tooltip
                        cursor={false}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-gray-900/95 border border-white/15 rounded-xl px-3 py-2 text-sm">
                              <div className="text-white text-xs">Row #{d.index}</div>
                              <div className="text-gray-400 text-xs">Segment {d.cluster + 1}</div>
                              <div className="text-gray-500 text-xs">PC1 {d.x.toFixed(2)} · PC2 {d.y.toFixed(2)}</div>
                            </div>
                          );
                        }}
                      />
                      {seriesByCluster.map((s) => (
                        <Scatter
                          key={s.cluster.id}
                          data={s.data}
                          fill={s.color}
                          fillOpacity={0.7}
                          shape="circle"
                          isAnimationActive={false}
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                  {seriesByCluster.map((s, i) => (
                    <span key={s.cluster.id} className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded" style={{ background: s.color }} />
                      <span className="text-gray-300">
                        Segment {i + 1} · <span className="text-white">{s.cluster.size.toLocaleString()}</span>
                      </span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Cluster summary cards */}
          {result && (
            <Card className="p-6">
              <SectionHeader
                title="Segment profiles"
                subtitle="Average values per segment, in original units"
                icon={<Badge tone="purple">{result.n_clusters}</Badge>}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.clusters.map((c, idx) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded" style={{ background: PALETTE[c.id % PALETTE.length] }} />
                      <span className="text-sm font-semibold text-white">Segment {idx + 1}</span>
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">
                      {c.label}
                    </div>
                    <div className="text-lg font-bold text-white tabular-nums">
                      {c.size.toLocaleString()}
                      <span className="text-xs font-medium text-gray-400 ml-1.5">
                        ({(c.pct * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <dl className="mt-3 space-y-1 text-xs">
                      {Object.entries(c.centroid).slice(0, 6).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="text-gray-400 truncate">{k}</dt>
                          <dd className="text-white tabular-nums">
                            {typeof v === "number" ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)) : v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
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

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-white tabular-nums">{value}</dd>
    </div>
  );
}
