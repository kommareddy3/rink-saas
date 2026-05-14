import React, { useMemo, useState } from "react";
import {
  Badge, Button, Card, DropZone, KpiCard, PageHeader,
  SectionHeader, ToastList, prettyError, useToasts,
} from "../components/ToolUI";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../api";
import ReportStudio from "../components/ReportStudio";

const COLORS = { grid: "#1f2937", axis: "#9ca3af" };

export default function ChurnPrediction() {
  const { toasts, toast, dismiss } = useToasts();
  const [file, setFile] = useState(null);
  const [labelColumn, setLabelColumn] = useState("");
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
      if (labelColumn.trim()) fd.append("label", labelColumn.trim());
      const res = await api.post("/api/churn/predict", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      toast.success(
        `Trained on ${res.data.rows.toLocaleString()} customers · accuracy ${(res.data.accuracy * 100).toFixed(1)}%.`
      );
    } catch (err) {
      toast.error(prettyError(err, "Churn prediction failed."));
    } finally {
      setRunning(false);
    }
  };

  const featureRows = result?.feature_importance || [];
  const risk = result?.risk_distribution || { high: 0, medium: 0, low: 0 };
  const cm = result?.confusion || {};
  const report = useMemo(() => {
    if (!result) return null;
    const highRiskPct = result.rows ? (risk.high / result.rows) * 100 : 0;
    const topFeature = featureRows[0]?.feature || "the strongest available feature";
    return {
      title: "Churn Prediction Report",
      subtitle: `Customer retention analysis across ${result.rows.toLocaleString()} accounts.`,
      summary: `RINK trained a churn model on ${result.rows.toLocaleString()} customer rows and identified ${risk.high.toLocaleString()} high-risk accounts (${highRiskPct.toFixed(1)}% of the dataset). The held-out accuracy is ${(result.accuracy * 100).toFixed(1)}%${result.auc != null ? ` with AUC ${result.auc.toFixed(3)}` : ""}. The strongest churn signal in this run is ${topFeature}.`,
      metrics: [
        { label: "Customers", value: result.rows.toLocaleString() },
        { label: "Accuracy", value: `${(result.accuracy * 100).toFixed(1)}%`, hint: "Held-out test split" },
        { label: "AUC", value: result.auc != null ? result.auc.toFixed(3) : "N/A" },
        { label: "High-risk accounts", value: risk.high.toLocaleString(), hint: "Probability >= 70%" },
        { label: "Base churn rate", value: `${(result.base_rate * 100).toFixed(1)}%` },
        { label: "Training rows", value: result.train_size.toLocaleString() },
      ],
      charts: [
        "Feature importance bar chart showing the strongest churn drivers.",
        "Risk distribution chart for high, medium, and low-risk customers.",
        "Top at-risk customer table ranked by churn probability.",
        "Confusion matrix for model review.",
      ],
      insights: [
        `${risk.high.toLocaleString()} accounts should be prioritized for retention outreach.`,
        `${risk.medium.toLocaleString()} accounts are in the medium-risk band and may benefit from proactive engagement.`,
        `The top model driver is ${topFeature}, which should be reviewed with customer success and sales teams.`,
        `The base churn rate is ${(result.base_rate * 100).toFixed(1)}%, useful as a benchmark for retention planning.`,
      ],
      recommendations: [
        "Create a high-risk customer review queue for customer success follow-up.",
        "Review the top feature drivers and validate whether they map to controllable business actions.",
        "Run this report on a regular cadence to monitor whether intervention efforts reduce high-risk volume.",
        "Pair model scores with account owner context before making client or renewal decisions.",
      ],
      slides: [
        { title: "Retention Risk Overview", detail: "Summarize customer count, base churn, accuracy, AUC, and high-risk volume." },
        { title: "What Drives Risk", detail: "Use feature importance to explain the strongest churn signals." },
        { title: "Accounts To Prioritize", detail: "Show top at-risk accounts and the recommended outreach plan." },
        { title: "Next Actions", detail: "Assign owners, outreach timing, and follow-up measurement." },
      ],
    };
  }, [featureRows, result, risk.high, risk.medium]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-7xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />
      <PageHeader
        eyebrow="Churn Prediction"
        title="Predict who's likely to leave"
        subtitle="Upload a customer table with a churn label (0/1 or yes/no). RINK trains a Random Forest classifier and surfaces the top at-risk accounts."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Customers" value={result ? result.rows.toLocaleString() : "—"} accent="blue" />
        <KpiCard
          label="Accuracy"
          value={result ? `${(result.accuracy * 100).toFixed(1)}%` : "—"}
          accent="emerald"
          hint="Held-out test split"
        />
        <KpiCard
          label="AUC"
          value={result?.auc != null ? result.auc.toFixed(3) : "—"}
          accent="purple"
          hint="Area under ROC curve"
        />
        <KpiCard
          label="High-risk"
          value={result ? risk.high.toLocaleString() : "—"}
          accent="red"
          hint="Probability ≥ 70%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Customer table"
              subtitle="One row per customer; one column labels churn (0/1, yes/no)."
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <DropZone file={file} onSelect={handleSelect} onClear={() => setFile(null)} disabled={running} />

            <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mt-4 mb-1.5">
              Label column (optional)
            </label>
            <input
              type="text"
              value={labelColumn}
              onChange={(e) => setLabelColumn(e.target.value)}
              placeholder="auto-detect (e.g. churn)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              We look for <code>churn</code>, <code>label</code>, or any 0/1 column.
            </p>

            <Button variant="primary" className="w-full mt-5" onClick={run} loading={running} disabled={!file}>
              {running ? "Training…" : "Train & predict"}
            </Button>
          </Card>

          {result && (
            <Card className="p-6">
              <SectionHeader title="Confusion matrix" subtitle="Test set, threshold 0.5." />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Cell label="True negatives" value={cm.tn} tone="emerald" />
                <Cell label="False positives" value={cm.fp} tone="amber" />
                <Cell label="False negatives" value={cm.fn} tone="amber" />
                <Cell label="True positives" value={cm.tp} tone="emerald" />
              </div>
              <p className="text-[11px] text-gray-500 mt-3">
                Base churn rate in your data: {(result.base_rate * 100).toFixed(1)}%.
              </p>
            </Card>
          )}
        </div>

        {/* Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Feature importance"
              subtitle="What signals the model is leaning on"
              icon={
                <svg className="w-5 h-5 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l3-3 4 4 5-5" />
                </svg>
              }
            />
            {!result ? (
              <div className="text-center py-12 text-gray-500 italic">Run a prediction to see importance.</div>
            ) : (
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureRows.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                    <XAxis type="number" stroke={COLORS.axis} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="feature" stroke={COLORS.axis} tickLine={false} axisLine={false} width={120} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172aee", border: "1px solid #334155", borderRadius: 10, color: "#e5e7eb" }}
                      formatter={(v) => Number(v).toFixed(4)}
                    />
                    <Bar dataKey="importance" fill="#a78bfa" radius={[0, 6, 6, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {result && (
            <Card className="p-6">
              <SectionHeader
                title="Top at-risk customers"
                subtitle={`Highest churn probability across the ${result.rows.toLocaleString()}-row dataset`}
                icon={<Badge tone="red">{risk.high}</Badge>}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3 text-right">Probability</th>
                      {result.top_at_risk?.[0]?.row && Object.keys(result.top_at_risk[0].row).slice(0, 3).map((k) => (
                        <th key={k} className="py-2 pr-3">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {result.top_at_risk?.slice(0, 10).map((row) => (
                      <tr key={row.index} className="text-gray-200">
                        <td className="py-2 pr-3 tabular-nums">{row.index}</td>
                        <td className="py-2 pr-3 text-right">
                          <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-200 text-xs tabular-nums">
                            {(row.probability * 100).toFixed(1)}%
                          </span>
                        </td>
                        {Object.keys(row.row).slice(0, 3).map((k) => (
                          <td key={k} className="py-2 pr-3 truncate max-w-[180px]" title={row.row[k]}>
                            {row.row[k]}
                          </td>
                        ))}
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

function Cell({ label, value, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-500/10 border-emerald-400/30 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-400/30 text-amber-200",
  };
  return (
    <div className={`px-3 py-2 rounded-lg border ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value ?? 0}</div>
    </div>
  );
}
