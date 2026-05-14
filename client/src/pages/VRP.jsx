import React, { useMemo, useState } from "react";
import {
  Badge, Button, Card, KpiCard, PageHeader,
  SectionHeader, ToastList, prettyError, useToasts,
} from "../components/ToolUI";
import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../api";
import ReportStudio from "../components/ReportStudio";

const ROUTE_COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#22d3ee", "#fb7185", "#84cc16"];
const COLORS = { grid: "#1f2937", axis: "#9ca3af", depot: "#fbbf24", point: "#94a3b8" };

const SAMPLE_DEPOT = "Warehouse, 0, 0";
const SAMPLE_CUSTOMERS = `A, 4, 5, 2
B, -3, 6, 1
C, 7, 2, 3
D, -5, -2, 2
E, 2, -6, 4
F, 8, 7, 1
G, -2, 8, 2
H, 6, -4, 3
I, -7, 3, 2
J, 1, 9, 1`;

function parseDepot(line) {
  const parts = (line || "").split(/[,\t]+/).map((s) => s.trim());
  if (parts.length < 3) return null;
  const [name, xR, yR] = parts.length === 3 ? ["Depot", parts[0], parts[1]] : parts;
  const x = parseFloat(xR);
  const y = parseFloat(yR);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { name: name || "Depot", x, y };
}

function parseCustomers(text) {
  const customers = [];
  const errors = [];
  text.split(/\n+/).forEach((line, i) => {
    const ln = line.trim();
    if (!ln || ln.startsWith("#")) return;
    const parts = ln.split(/[,\t]+/).map((s) => s.trim());
    if (parts.length < 3) {
      errors.push(`Line ${i + 1}: need at least name, x, y (and optionally demand)`);
      return;
    }
    const [name, xR, yR, dR] = parts;
    const x = parseFloat(xR);
    const y = parseFloat(yR);
    const demand = parseFloat(dR ?? "1");
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(demand)) {
      errors.push(`Line ${i + 1}: x, y, demand must be numbers`);
      return;
    }
    customers.push({ name, x, y, demand });
  });
  return { customers, errors };
}

export default function VRP() {
  const { toasts, toast, dismiss } = useToasts();
  const [depotInput, setDepotInput] = useState(SAMPLE_DEPOT);
  const [customersInput, setCustomersInput] = useState(SAMPLE_CUSTOMERS);
  const [numVehicles, setNumVehicles] = useState(3);
  const [vehicleCapacity, setVehicleCapacity] = useState(8);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const depot = useMemo(() => parseDepot(depotInput), [depotInput]);
  const { customers, errors } = useMemo(() => parseCustomers(customersInput), [customersInput]);

  const totalDemand = customers.reduce((s, c) => s + c.demand, 0);

  const run = async () => {
    if (!depot) return toast.error("Depot must be in the format 'name, x, y'.");
    if (!customers.length) return toast.error("Add at least one customer.");
    if (errors.length) return toast.error(errors[0]);

    setRunning(true);
    try {
      const res = await api.post("/api/vrp/solve", {
        depot,
        customers,
        num_vehicles: numVehicles,
        vehicle_capacity: vehicleCapacity,
      });
      setResult(res.data);
      toast.success(
        `${res.data.routes.length} routes · total ${res.data.total_distance.toFixed(2)} units${
          res.data.unserved.length ? ` · ${res.data.unserved.length} unserved` : ""
        }`
      );
    } catch (err) {
      toast.error(prettyError(err, "VRP solver failed."));
    } finally {
      setRunning(false);
    }
  };

  // Build chart series: one Scatter per vehicle (with line through route),
  // plus a scatter for the depot and unserved customers.
  const chartSeries = useMemo(() => {
    if (!result) {
      return {
        routes: [],
        depot: depot ? [depot] : [],
        customers: customers.map((c) => ({ ...c, group: "customer" })),
      };
    }
    return {
      routes: result.routes.map((r, idx) => ({
        color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
        load: r.load,
        distance: r.distance,
        vehicle: r.vehicle,
        path: r.coordinates.map(([x, y], i) => ({
          x, y, name: r.names[i], step: i, vehicle: r.vehicle,
        })),
      })),
      depot: depot ? [depot] : [],
      customers: result.unserved.map((idx) => ({ ...customers[idx], group: "unserved" })),
    };
  }, [result, depot, customers]);
  const report = useMemo(() => {
    if (!result) return null;
    const served = customers.length - (result.unserved?.length || 0);
    const avgLoad = result.routes.length ? result.total_load / result.routes.length : 0;
    return {
      title: "Vehicle Routing Report",
      subtitle: `Fleet plan for ${customers.length.toLocaleString()} customers and ${numVehicles} available vehicles.`,
      summary: `RINK planned ${result.routes.length} active vehicle routes serving ${served.toLocaleString()} of ${customers.length.toLocaleString()} customers. Total route distance is ${result.total_distance.toFixed(2)} units, total load is ${result.total_load.toFixed(1)}, and ${result.unserved.length} customers are currently unserved under the capacity and vehicle constraints.`,
      metrics: [
        { label: "Customers", value: customers.length.toLocaleString() },
        { label: "Served", value: served.toLocaleString() },
        { label: "Unserved", value: result.unserved.length.toLocaleString() },
        { label: "Routes used", value: result.routes.length },
        { label: "Total distance", value: result.total_distance.toFixed(2) },
        { label: "Average load", value: avgLoad.toFixed(1), hint: `Capacity ${result.vehicle_capacity}` },
      ],
      charts: [
        "Vehicle route map with one color per active route.",
        "Route list showing stops, load, and distance by vehicle.",
        "Unserved customer list for capacity or fleet planning review.",
      ],
      insights: [
        `${result.routes.length} vehicles are active in the proposed plan.`,
        `${served.toLocaleString()} customers are served and ${result.unserved.length.toLocaleString()} are unserved.`,
        `Average vehicle load is ${avgLoad.toFixed(1)} against a capacity of ${result.vehicle_capacity}.`,
        `Total route distance is ${result.total_distance.toFixed(2)} units.`,
      ],
      recommendations: [
        result.unserved.length ? "Increase vehicle count, capacity, or adjust demand assumptions to serve remaining customers." : "Review the proposed routes for real-world constraints before dispatch.",
        "Validate route feasibility against service windows, road constraints, shift length, and driver availability.",
        "Use the route list as a dispatcher-ready plan and rerun when demand or stop locations change.",
      ],
      slides: [
        { title: "Fleet Plan Summary", detail: "Show customers, routes used, total load, distance, and unserved count." },
        { title: "Route Map", detail: "Present one color per vehicle and identify unserved stops if any." },
        { title: "Dispatch Actions", detail: "Confirm capacity decisions and assign route execution owners." },
      ],
    };
  }, [customers.length, numVehicles, result]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-7xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />
      <PageHeader
        eyebrow="Route Optimization"
        title="Vehicle Routing Problem"
        subtitle="Multiple vehicles, one depot, capacity constraints. Solved with Clarke-Wright savings + per-route 2-opt."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Customers" value={customers.length || "—"} accent="blue" />
        <KpiCard
          label="Total demand"
          value={totalDemand || "—"}
          hint={`Vehicle capacity ${vehicleCapacity}`}
          accent="amber"
        />
        <KpiCard
          label="Routes used"
          value={result ? result.routes.length : "—"}
          accent="emerald"
        />
        <KpiCard
          label="Total distance"
          value={result ? result.total_distance.toFixed(2) : "—"}
          accent="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Depot"
              subtitle="Where vehicles start and end."
              icon={
                <svg className="w-5 h-5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M3 7v10l9 4 9-4V7M3 7l9 4 9-4" />
                </svg>
              }
            />
            <input
              type="text"
              value={depotInput}
              onChange={(e) => setDepotInput(e.target.value)}
              spellCheck={false}
              placeholder="Warehouse, 0, 0"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono text-sm"
            />
          </Card>

          <Card className="p-6">
            <SectionHeader
              title="Customers"
              subtitle={`Format: name, x, y, demand. Currently ${customers.length} parsed.`}
              action={
                <Button variant="ghost" onClick={() => setCustomersInput(SAMPLE_CUSTOMERS)}>
                  Sample
                </Button>
              }
            />
            <textarea
              rows={10}
              value={customersInput}
              onChange={(e) => setCustomersInput(e.target.value)}
              spellCheck={false}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm resize-y"
              placeholder="A, 4, 5, 2"
            />
            {errors.length > 0 && (
              <p className="text-xs text-red-300 mt-2">{errors[0]}</p>
            )}
          </Card>

          <Card className="p-6">
            <SectionHeader title="Fleet" subtitle="How many vehicles, and how much each can carry." />
            <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
              Number of vehicles: <span className="text-white">{numVehicles}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={numVehicles}
              onChange={(e) => setNumVehicles(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mt-4 mb-1.5">
              Vehicle capacity: <span className="text-white">{vehicleCapacity}</span>
            </label>
            <input
              type="range"
              min="1"
              max={Math.max(20, totalDemand || 20)}
              step="1"
              value={vehicleCapacity}
              onChange={(e) => setVehicleCapacity(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Tip: capacity × vehicles should ≥ total demand ({totalDemand}) to serve everyone.
            </p>

            <Button
              variant="primary"
              className="w-full mt-4"
              onClick={run}
              loading={running}
              disabled={!depot || customers.length === 0 || errors.length > 0}
            >
              {running ? "Solving…" : "Plan routes"}
            </Button>
          </Card>
        </div>

        {/* Visualization */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Route map"
              subtitle={result ? "One colour per vehicle. Yellow diamond = depot." : "Click Plan routes to visualise."}
              action={result?.unserved?.length ? <Badge tone="red">{result.unserved.length} unserved</Badge> : null}
            />
            <div className="w-full h-[460px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 16, right: 24, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="x" type="number" stroke={COLORS.axis} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
                  <YAxis dataKey="y" type="number" stroke={COLORS.axis} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
                  <Tooltip
                    cursor={false}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-gray-900/95 border border-white/15 rounded-xl px-3 py-2 text-sm">
                          <div className="text-white font-medium">{d.name}</div>
                          <div className="text-gray-400 text-xs">({d.x.toFixed(2)}, {d.y.toFixed(2)})</div>
                          {d.vehicle && <div className="text-purple-300 text-xs mt-1">Vehicle {d.vehicle} · step {d.step}</div>}
                          {d.demand != null && <div className="text-amber-300 text-xs">Demand {d.demand}</div>}
                          {d.group === "unserved" && <div className="text-red-300 text-xs">Not served</div>}
                        </div>
                      );
                    }}
                  />
                  {/* All customers as faint background */}
                  {!result && (
                    <Scatter
                      data={chartSeries.customers}
                      fill={COLORS.point}
                      shape="circle"
                      isAnimationActive={false}
                    />
                  )}
                  {/* Routes */}
                  {chartSeries.routes.map((r, idx) => (
                    <Scatter
                      key={idx}
                      data={r.path}
                      fill={r.color}
                      line={{ stroke: r.color, strokeWidth: 2 }}
                      lineType="joint"
                      shape="circle"
                      isAnimationActive={false}
                    />
                  ))}
                  {/* Unserved */}
                  {result && chartSeries.customers.length > 0 && (
                    <Scatter
                      data={chartSeries.customers}
                      fill="#ef4444"
                      shape="cross"
                      isAnimationActive={false}
                    />
                  )}
                  {/* Depot */}
                  <Scatter
                    data={chartSeries.depot}
                    fill={COLORS.depot}
                    shape="diamond"
                    isAnimationActive={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {result && (
            <Card className="p-6">
              <SectionHeader title="Routes" subtitle={`${result.routes.length} active vehicles`} />
              <ul className="space-y-2">
                {result.routes.map((r, idx) => {
                  const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
                  const customersInRoute = r.names.slice(1, -1); // strip depot at start/end
                  return (
                    <li
                      key={r.vehicle}
                      className="p-3 rounded-xl border border-white/10 bg-white/[0.03]"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm font-medium text-white">
                            Vehicle {r.vehicle}
                          </span>
                          <Badge tone="gray">
                            {customersInRoute.length} stops
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-4 tabular-nums">
                          <span>Load: <span className="text-white">{r.load}</span> / {result.vehicle_capacity}</span>
                          <span>Distance: <span className="text-white">{r.distance.toFixed(2)}</span></span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-300">
                        Depot →{" "}
                        {customersInRoute.map((n, i) => (
                          <span key={i}>
                            <span className="text-white">{n}</span>
                            {i < customersInRoute.length - 1 ? " → " : ""}
                          </span>
                        ))}{" "}
                        → Depot
                      </div>
                    </li>
                  );
                })}
              </ul>
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
