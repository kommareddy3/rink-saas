import React, { useMemo, useState } from "react";
import {
  Badge, Button, Card, KpiCard, PageHeader,
  SectionHeader, ToastList, prettyError, useToasts,
} from "../components/ToolUI";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../api";
import ReportStudio from "../components/ReportStudio";

const COLORS = {
  point: "#60a5fa",
  route: "#a78bfa",
  grid: "#1f2937",
  axis: "#9ca3af",
};

const SAMPLE_INPUT = `A, 0, 0
B, 10, 0
C, 10, 8
D, 5, 12
E, 0, 8
F, 3, 5
G, 7, 3`;

function parsePoints(text) {
  const points = [];
  const errors = [];
  text.split(/\n+/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const parts = line.split(/[,\t]+/).map((s) => s.trim());
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: need at least x,y`);
      return;
    }
    let name, xRaw, yRaw;
    if (parts.length === 2) {
      [xRaw, yRaw] = parts;
      name = `#${points.length + 1}`;
    } else {
      [name, xRaw, yRaw] = parts;
    }
    const x = parseFloat(xRaw);
    const y = parseFloat(yRaw);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      errors.push(`Line ${i + 1}: x and y must be numbers`);
      return;
    }
    points.push({ name, x, y });
  });
  return { points, errors };
}

export default function TSP() {
  const { toasts, toast, dismiss } = useToasts();
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [returnToStart, setReturnToStart] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const { points, errors } = useMemo(() => parsePoints(input), [input]);

  const run = async () => {
    if (points.length < 2) {
      toast.error("Need at least 2 points.");
      return;
    }
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setRunning(true);
    try {
      const res = await api.post("/api/tsp/solve", {
        points,
        return_to_start: returnToStart,
      });
      setResult(res.data);
      toast.success(
        `Route found · ${res.data.total_distance.toFixed(2)} units (${(((res.data.improved_from - res.data.total_distance) / res.data.improved_from) * 100).toFixed(1)}% improvement)`
      );
    } catch (err) {
      toast.error(prettyError(err, "TSP solver failed."));
    } finally {
      setRunning(false);
    }
  };

  // Chart data: route polyline + dots labelled with names.
  const routeData = useMemo(() => {
    if (!result) {
      return { line: [], scatter: points.map((p) => ({ ...p })) };
    }
    const line = result.coordinates.map(([x, y], i) => ({
      x, y, name: result.names[i], order: i + 1,
    }));
    const scatter = points.map((p) => ({ ...p }));
    return { line, scatter };
  }, [result, points]);
  const report = useMemo(() => {
    if (!result) return null;
    const improvement = result.improved_from
      ? ((1 - result.total_distance / result.improved_from) * 100)
      : 0;
    return {
      title: "Route Optimization Report",
      subtitle: `Single-route plan across ${points.length.toLocaleString()} locations.`,
      summary: `RINK optimized a route across ${points.length.toLocaleString()} locations with a total distance of ${result.total_distance.toFixed(2)} units. The optimized sequence is ${improvement.toFixed(1)}% shorter than the nearest-neighbor starting route.`,
      metrics: [
        { label: "Locations", value: points.length.toLocaleString() },
        { label: "Total distance", value: result.total_distance.toFixed(2) },
        { label: "Improvement", value: `${improvement.toFixed(1)}%`, hint: "vs nearest-neighbor start" },
        { label: "2-opt iterations", value: result.iterations },
        { label: "Route type", value: returnToStart ? "Closed loop" : "Open route" },
      ],
      charts: [
        "Route map with optimized stop order.",
        "Route order table for dispatcher or field-team execution.",
        "Leg distance table showing distance between each stop.",
      ],
      insights: [
        `The route visits ${points.length.toLocaleString()} locations${returnToStart ? " and returns to the start" : " without returning to the start"}.`,
        `Total optimized distance is ${result.total_distance.toFixed(2)} units.`,
        `The optimization improved the starting route by ${improvement.toFixed(1)}%.`,
      ],
      recommendations: [
        "Review the route order with operational constraints such as appointment windows, driver availability, and service duration.",
        "Export the route order for dispatch or field-team review.",
        "Re-run with updated coordinates if stops or priorities change.",
      ],
      slides: [
        { title: "Route Objective", detail: "Summarize locations, route type, and optimization goal." },
        { title: "Optimized Route", detail: "Show the route map and ordered stop list." },
        { title: "Operational Recommendation", detail: "Explain route savings and execution considerations." },
      ],
    };
  }, [points.length, result, returnToStart]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-7xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />
      <PageHeader
        eyebrow="Route Optimization"
        title="Travelling Salesman Problem"
        subtitle="Given a set of locations, find the shortest route that visits each exactly once and (optionally) returns to the start."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Locations" value={points.length || "—"} accent="blue" />
        <KpiCard
          label="Total distance"
          value={result ? result.total_distance.toFixed(2) : "—"}
          accent="emerald"
        />
        <KpiCard
          label="Improvement"
          value={result ? `${(((result.improved_from - result.total_distance) / result.improved_from) * 100).toFixed(1)}%` : "—"}
          hint="vs nearest-neighbor start"
          accent="purple"
        />
        <KpiCard
          label="2-opt iterations"
          value={result?.iterations ?? "—"}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Locations"
              subtitle={`One per line — "name, x, y" (name optional). Currently ${points.length} parsed.`}
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              action={
                <Button variant="ghost" onClick={() => setInput(SAMPLE_INPUT)}>
                  Sample
                </Button>
              }
            />
            <textarea
              rows={10}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm resize-y"
              placeholder={"name, x, y\nWarehouse, 0, 0\n…"}
            />
            {errors.length > 0 && (
              <p className="text-xs text-red-300 mt-2">{errors[0]}</p>
            )}

            <label className="flex items-center gap-2 mt-4 text-sm text-gray-300 select-none">
              <input
                type="checkbox"
                checked={returnToStart}
                onChange={(e) => setReturnToStart(e.target.checked)}
                className="accent-blue-500"
              />
              Return to start (closed loop)
            </label>

            <Button
              variant="primary"
              className="w-full mt-4"
              onClick={run}
              loading={running}
              disabled={points.length < 2 || errors.length > 0}
            >
              {running ? "Solving…" : "Find shortest route"}
            </Button>
          </Card>

          {result && (
            <Card className="p-6">
              <SectionHeader title="Route order" />
              <ol className="space-y-1.5 text-sm">
                {result.names.map((n, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5"
                  >
                    <span className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs flex items-center justify-center font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-white truncate">{n}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {/* Visualization */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Route map"
              subtitle={result ? "Purple line shows the optimized order" : "Click Solve to see the route"}
              action={
                result?.improved_from && (
                  <Badge tone="emerald">
                    {((1 - result.total_distance / result.improved_from) * 100).toFixed(1)}% shorter
                  </Badge>
                )
              }
            />
            <div className="w-full h-[460px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="x" type="number" stroke={COLORS.axis} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
                  <YAxis dataKey="y" type="number" stroke={COLORS.axis} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172aee", border: "1px solid #334155", borderRadius: 10, color: "#e5e7eb" }}
                    cursor={false}
                    formatter={(v, k, p) => [v, k]}
                    labelFormatter={() => ""}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-gray-900/95 border border-white/15 rounded-xl px-3 py-2 text-sm">
                          <div className="text-white font-medium">{d.name}</div>
                          <div className="text-gray-400 text-xs">({d.x.toFixed(2)}, {d.y.toFixed(2)})</div>
                          {d.order && <div className="text-purple-300 text-xs mt-1">Step {d.order}</div>}
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={routeData.scatter}
                    fill={COLORS.point}
                    line={{ stroke: "none" }}
                    shape="circle"
                    isAnimationActive={false}
                  />
                  {routeData.line.length > 0 && (
                    <Scatter
                      data={routeData.line}
                      fill={COLORS.route}
                      line={{ stroke: COLORS.route, strokeWidth: 2 }}
                      lineType="joint"
                      shape="circle"
                      isAnimationActive={false}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-gray-500 mt-2 text-center">
              Coordinates are abstract units — x and y can be lat/lon or any Cartesian pair.
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <ReportStudio report={report} />
      </div>
    </div>
  );
}
