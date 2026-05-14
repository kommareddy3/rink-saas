import React, { useMemo, useState } from "react";
import {
  Badge, Button, Card, KpiCard, PageHeader,
  SectionHeader, ToastList, prettyError, useToasts,
} from "../components/ToolUI";
import {
  Bar, BarChart, CartesianGrid, Cell, ErrorBar,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../api";
import ReportStudio from "../components/ReportStudio";

const COLORS = {
  control: "#60a5fa",
  variant: "#a78bfa",
  grid: "#1f2937",
  axis: "#9ca3af",
};

const MODES = { CONTINUOUS: "continuous", CONVERSION: "conversion" };

const SAMPLE_CONTINUOUS_CONTROL = `12.5, 13.1, 11.8, 14.2, 13.7, 12.9, 13.4, 13.0, 12.6, 13.3
13.9, 12.4, 13.6, 12.8, 13.5, 14.0, 13.2, 12.7, 13.8, 14.1`;

const SAMPLE_CONTINUOUS_VARIANT = `14.0, 14.5, 13.8, 15.1, 14.7, 14.3, 14.9, 14.4, 14.2, 14.6
15.2, 14.8, 15.0, 13.9, 14.5, 14.7, 14.1, 14.3, 14.6, 15.0`;

function parseNumbers(text) {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseFloat(s))
    .filter((n) => Number.isFinite(n));
}

function fmt(n, digits = 4) {
  if (n == null || !Number.isFinite(n)) return "—";
  return Number(n).toFixed(digits);
}

function fmtPct(n, digits = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export default function ABTest() {
  const { toasts, toast, dismiss } = useToasts();
  const [mode, setMode] = useState(MODES.CONTINUOUS);

  // Continuous mode
  const [controlText, setControlText] = useState(SAMPLE_CONTINUOUS_CONTROL);
  const [variantText, setVariantText] = useState(SAMPLE_CONTINUOUS_VARIANT);
  const [controlName, setControlName] = useState("Control");
  const [variantName, setVariantName] = useState("Variant");

  // Conversion mode
  const [cVisitors, setCVisitors] = useState(2000);
  const [cConvs, setCConvs] = useState(160);
  const [vVisitors, setVVisitors] = useState(2000);
  const [vConvs, setVConvs] = useState(196);

  const [alpha, setAlpha] = useState(5); // percent
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const controlVals = useMemo(() => parseNumbers(controlText), [controlText]);
  const variantVals = useMemo(() => parseNumbers(variantText), [variantText]);

  const run = async () => {
    setRunning(true);
    try {
      let res;
      if (mode === MODES.CONTINUOUS) {
        if (controlVals.length < 2 || variantVals.length < 2) {
          toast.error("Each group needs at least 2 numeric values.");
          return;
        }
        res = await api.post("/api/abtest/continuous", {
          control: { name: controlName || "Control", values: controlVals },
          variant: { name: variantName || "Variant", values: variantVals },
          alpha: alpha / 100,
        });
      } else {
        if (cVisitors <= 0 || vVisitors <= 0) {
          toast.error("Visitors must be positive.");
          return;
        }
        if (cConvs > cVisitors || vConvs > vVisitors) {
          toast.error("Conversions can't exceed visitors.");
          return;
        }
        res = await api.post("/api/abtest/conversion", {
          control: { name: controlName || "Control", visitors: cVisitors, conversions: cConvs },
          variant: { name: variantName || "Variant", visitors: vVisitors, conversions: vConvs },
          alpha: alpha / 100,
        });
      }
      setResult(res.data);
      if (res.data.significant) {
        toast.success(`Significant at α=${alpha / 100} · p=${fmt(res.data.p_value, 4)}`);
      } else {
        toast.info(`Not significant · p=${fmt(res.data.p_value, 4)}`);
      }
    } catch (err) {
      toast.error(prettyError(err, "A/B test analysis failed."));
    } finally {
      setRunning(false);
    }
  };

  // Bar chart data with CI error bars.
  const chartData = useMemo(() => {
    if (!result) return [];
    const isPct = result.test === "two-proportion-z";
    const scale = isPct ? 100 : 1;
    return [result.control, result.variant].map((arm, i) => {
      const value = arm.metric * scale;
      const lo = arm.ci_low * scale;
      const hi = arm.ci_high * scale;
      return {
        name: arm.name,
        value,
        // ErrorBar uses [lower offset, upper offset]
        errors: [value - lo, hi - value],
        fill: i === 0 ? COLORS.control : COLORS.variant,
      };
    });
  }, [result]);
  const report = useMemo(() => {
    if (!result) return null;
    const isConversion = result.test === "two-proportion-z";
    const metricLabel = isConversion ? "conversion rate" : "mean metric";
    const lift = isConversion ? fmtPct(result.diff_absolute, 2) : fmt(result.diff_absolute, 3);
    return {
      title: "A/B Test Analysis Report",
      subtitle: `${result.control.name} vs ${result.variant.name} ${isConversion ? "conversion" : "continuous metric"} comparison.`,
      summary: `${result.variant.name} ${result.diff_absolute >= 0 ? "outperformed" : "underperformed"} ${result.control.name} by ${lift}${result.diff_relative != null ? ` (${fmtPct(result.diff_relative, 1)} relative lift)` : ""}. The result is ${result.significant ? "" : "not "}statistically significant at alpha ${result.alpha}, with p-value ${fmt(result.p_value, 4)}.`,
      metrics: [
        { label: "Verdict", value: result.significant ? "Significant" : "Not significant", hint: `alpha ${result.alpha}` },
        { label: "p-value", value: fmt(result.p_value, 4) },
        { label: "Absolute lift", value: lift },
        { label: "Relative lift", value: result.diff_relative != null ? fmtPct(result.diff_relative, 1) : "N/A" },
        { label: result.control.name, value: isConversion ? fmtPct(result.control.metric, 2) : fmt(result.control.metric, 3), hint: `n=${result.control.n.toLocaleString()}` },
        { label: result.variant.name, value: isConversion ? fmtPct(result.variant.metric, 2) : fmt(result.variant.metric, 3), hint: `n=${result.variant.n.toLocaleString()}` },
      ],
      charts: [
        `Bar chart comparing ${metricLabel} for control and variant.`,
        "Confidence interval whiskers for each arm.",
        "Lift summary chart showing absolute and relative change.",
      ],
      insights: [
        result.interpretation,
        `Control ${metricLabel}: ${isConversion ? fmtPct(result.control.metric, 2) : fmt(result.control.metric, 3)}.`,
        `Variant ${metricLabel}: ${isConversion ? fmtPct(result.variant.metric, 2) : fmt(result.variant.metric, 3)}.`,
        result.required_sample_size_per_arm ? `Estimated required sample size is ${result.required_sample_size_per_arm.toLocaleString()} per arm at 80% power.` : "Sample-size guidance is not available for this run.",
      ],
      recommendations: [
        result.significant ? "Consider rolling out the winning variant after confirming business and implementation risk." : "Continue collecting data or run a larger test before declaring a winner.",
        "Review confidence intervals, not only the p-value, before making a decision.",
        "Document test setup, traffic source, duration, and any operational changes that could affect interpretation.",
      ],
      notes: result.notes,
      slides: [
        { title: "Experiment Setup", detail: "Define control, variant, metric, sample sizes, and alpha." },
        { title: "Result and Lift", detail: "Show arm metrics, confidence intervals, lift, and p-value." },
        { title: "Decision Recommendation", detail: "Explain whether to ship, continue, or redesign the experiment." },
      ],
    };
  }, [result]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-7xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />
      <PageHeader
        eyebrow="A/B Testing"
        title="Decide whether your variant actually won"
        subtitle="Paste two cohorts — continuous values or visitor/conversion counts — and get a proper statistical verdict in under a second."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Verdict"
          value={
            !result ? "—" : result.significant ? "Significant" : "Not yet"
          }
          accent={!result ? "blue" : result.significant ? "emerald" : "amber"}
          hint={result ? `α = ${result.alpha}` : "Run a test to see"}
        />
        <KpiCard
          label="p-value"
          value={result ? fmt(result.p_value, 4) : "—"}
          accent="purple"
          hint={result?.test === "welch-t" ? "Welch's t-test" : result?.test === "two-proportion-z" ? "Two-proportion z-test" : ""}
        />
        <KpiCard
          label="Absolute lift"
          value={
            !result
              ? "—"
              : result.test === "two-proportion-z"
              ? fmtPct(result.diff_absolute, 2)
              : fmt(result.diff_absolute, 3)
          }
          accent="blue"
          hint={result ? `CI [${result.test === "two-proportion-z" ? fmtPct(result.diff_ci_low) + ", " + fmtPct(result.diff_ci_high) : fmt(result.diff_ci_low, 2) + ", " + fmt(result.diff_ci_high, 2)}]` : ""}
        />
        <KpiCard
          label="Relative lift"
          value={result?.diff_relative != null ? fmtPct(result.diff_relative, 1) : "—"}
          accent="emerald"
          hint="Variant vs Control"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Test type"
              subtitle="Pick the metric you're comparing"
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
            />
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { id: MODES.CONTINUOUS, label: "Continuous", hint: "Revenue, duration, etc." },
                { id: MODES.CONVERSION, label: "Conversion", hint: "Rates / proportions" },
              ].map((opt) => {
                const active = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setMode(opt.id); setResult(null); }}
                    className={`p-3 rounded-xl border text-left transition ${
                      active
                        ? "bg-blue-500/20 border-blue-400/50 text-white"
                        : "bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-gray-400">{opt.hint}</div>
                  </button>
                );
              })}
            </div>

            <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
              Significance level α: <span className="text-white">{alpha / 100}</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={alpha}
              onChange={(e) => setAlpha(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">Default 0.05. Lower = stricter.</p>
          </Card>

          {mode === MODES.CONTINUOUS ? (
            <Card className="p-6">
              <SectionHeader
                title="Cohort values"
                subtitle="One arm per textarea. Comma- or whitespace-separated numbers."
                action={
                  <Button variant="ghost" onClick={() => {
                    setControlText(SAMPLE_CONTINUOUS_CONTROL);
                    setVariantText(SAMPLE_CONTINUOUS_VARIANT);
                  }}>
                    Sample
                  </Button>
                }
              />
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={controlName}
                    onChange={(e) => setControlName(e.target.value)}
                    placeholder="Control"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm mb-2"
                  />
                  <textarea
                    rows={4}
                    value={controlText}
                    onChange={(e) => setControlText(e.target.value)}
                    spellCheck={false}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm resize-y"
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    {controlVals.length} value{controlVals.length === 1 ? "" : "s"} parsed
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    placeholder="Variant"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-sm mb-2"
                  />
                  <textarea
                    rows={4}
                    value={variantText}
                    onChange={(e) => setVariantText(e.target.value)}
                    spellCheck={false}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono text-sm resize-y"
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    {variantVals.length} value{variantVals.length === 1 ? "" : "s"} parsed
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <SectionHeader title="Counts" subtitle="Visitors and conversions per arm." />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={controlName}
                    onChange={(e) => setControlName(e.target.value)}
                    placeholder="Control"
                    className="w-full px-3 py-2 rounded-lg bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-blue-400/60 focus:outline-none text-sm mb-2"
                  />
                  <NumberField label="Visitors" value={cVisitors} onChange={setCVisitors} />
                  <NumberField label="Conversions" value={cConvs} onChange={setCConvs} />
                  <div className="text-[11px] text-gray-500 mt-1 text-center">
                    Rate: <span className="text-white">{fmtPct(cVisitors ? cConvs / cVisitors : 0, 2)}</span>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    placeholder="Variant"
                    className="w-full px-3 py-2 rounded-lg bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-purple-400/60 focus:outline-none text-sm mb-2"
                  />
                  <NumberField label="Visitors" value={vVisitors} onChange={setVVisitors} />
                  <NumberField label="Conversions" value={vConvs} onChange={setVConvs} />
                  <div className="text-[11px] text-gray-500 mt-1 text-center">
                    Rate: <span className="text-white">{fmtPct(vVisitors ? vConvs / vVisitors : 0, 2)}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Button variant="primary" className="w-full" onClick={run} loading={running}>
            {running ? "Analysing…" : "Run analysis"}
          </Button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Verdict"
              subtitle={result?.interpretation || "Run an analysis to see the result"}
              action={
                result ? (
                  <Badge tone={result.significant ? "emerald" : "amber"}>
                    {result.significant ? "Significant" : "Not significant"}
                  </Badge>
                ) : null
              }
            />
            {!result ? (
              <div className="text-center py-10 text-gray-500 italic">
                Provide cohort data on the left and click <em>Run analysis</em>.
              </div>
            ) : (
              <>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 24, right: 32, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={COLORS.axis} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke={COLORS.axis}
                        tickLine={false}
                        axisLine={false}
                        width={60}
                        tickFormatter={(v) => result.test === "two-proportion-z" ? `${v.toFixed(1)}%` : v.toFixed(2)}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-gray-900/95 border border-white/15 rounded-xl px-3 py-2 text-sm">
                              <div className="text-white font-medium">{d.name}</div>
                              <div className="text-gray-300">
                                {result.test === "two-proportion-z" ? `${d.value.toFixed(2)}%` : d.value.toFixed(4)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {(1 - result.alpha) * 100}% CI ±
                                {result.test === "two-proportion-z" ? ` ${d.errors[0].toFixed(2)}% / ${d.errors[1].toFixed(2)}%` : ` ${d.errors[0].toFixed(3)} / ${d.errors[1].toFixed(3)}`}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                        <ErrorBar dataKey="errors" width={12} stroke="#ffffff" strokeOpacity={0.6} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-gray-500 mt-2 text-center">
                  Bars show the {result.test === "two-proportion-z" ? "conversion rate" : "mean"} per arm. Whiskers are {(1 - result.alpha) * 100}% confidence intervals.
                </p>
              </>
            )}
          </Card>

          {result && (
            <Card className="p-6">
              <SectionHeader title="Detail" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <ArmCard arm={result.control} mode={mode} tone="blue" />
                <ArmCard arm={result.variant} mode={mode} tone="purple" />
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Stat label="Test" value={result.test === "welch-t" ? "Welch's t-test" : "Two-proportion z-test"} />
                <Stat label="α (alpha)" value={result.alpha} />
                <Stat label="Test statistic" value={fmt(result.test_statistic, 3)} />
                <Stat label="p-value" value={fmt(result.p_value, 4)} />
                {result.df != null && <Stat label="Degrees of freedom" value={fmt(result.df, 2)} />}
                {result.required_sample_size_per_arm != null && (
                  <Stat label="Required n / arm @ 80% power" value={result.required_sample_size_per_arm.toLocaleString()} />
                )}
              </dl>

              {result.notes?.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-400/20 text-xs text-blue-100 space-y-1">
                  {result.notes.map((n, i) => <div key={i}>• {n}</div>)}
                </div>
              )}
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

function NumberField({ label, value, onChange }) {
  return (
    <label className="block mb-2">
      <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
        className="w-full px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10 focus:border-blue-400/60 focus:outline-none text-sm tabular-nums"
      />
    </label>
  );
}

function ArmCard({ arm, mode, tone }) {
  const tones = {
    blue: "border-blue-400/30 bg-blue-500/10 text-blue-200",
    purple: "border-purple-400/30 bg-purple-500/10 text-purple-200",
  };
  const isConv = mode === MODES.CONVERSION;
  return (
    <div className={`p-3 rounded-xl border ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{arm.name}</div>
      <div className="text-lg font-bold text-white tabular-nums mt-1">
        {isConv ? fmtPct(arm.metric, 2) : fmt(arm.metric, 3)}
      </div>
      <div className="text-[11px] text-gray-300 mt-1">
        n = {arm.n.toLocaleString()}<br />
        {isConv
          ? `CI [${fmtPct(arm.ci_low, 2)}, ${fmtPct(arm.ci_high, 2)}]`
          : `CI [${fmt(arm.ci_low, 2)}, ${fmt(arm.ci_high, 2)}]`}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-white tabular-nums">{value}</dd>
    </div>
  );
}
