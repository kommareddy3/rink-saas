import React, { useMemo, useState } from "react";
import { Badge, Button, Card, SectionHeader } from "./ToolUI";
import logo from "../assets/rink-logo.png";
import api from "../api";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return String(value || "rink-report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function asLines(items) {
  return (items || []).filter(Boolean);
}

function buildMarkdown(report, meta) {
  const lines = [
    `# ${report.title}`,
    "",
    report.subtitle,
    "",
    `Prepared by RINK Global Services`,
    `Prepared for: ${meta.clientName || "Client"}`,
    `Objective: ${meta.objective || "Business analysis and decision support"}`,
    `Date: ${meta.date}`,
    "",
    "## Executive Summary",
    "",
    report.summary,
    "",
    "## Key Metrics",
    "",
    ...(report.metrics || []).map((m) => `- **${m.label}:** ${m.value}${m.hint ? ` (${m.hint})` : ""}`),
    "",
    "## Charts To Include",
    "",
    ...asLines(report.charts).map((item) => `- ${item}`),
    "",
    "## Business Insights",
    "",
    ...asLines(report.insights).map((item) => `- ${item}`),
    "",
    "## Recommendations",
    "",
    ...asLines(report.recommendations).map((item) => `- ${item}`),
    "",
    "## Presentation Outline",
    "",
    ...(report.slides || []).map((slide, idx) => `${idx + 1}. **${slide.title}** - ${slide.detail}`),
    "",
    "## Notes",
    "",
    ...(report.notes || [
      "Outputs should be reviewed in business context before decisions are made.",
      "Use the workspace charts as the source visuals for the final presentation.",
    ]).map((item) => `- ${item}`),
    "",
  ];
  return lines.filter((line) => line != null).join("\n");
}

function buildHtml(report, meta) {
  const metricCards = (report.metrics || [])
    .map(
      (m) => `
        <div class="metric">
          <div class="metric-label">${escapeHtml(m.label)}</div>
          <div class="metric-value">${escapeHtml(m.value)}</div>
          ${m.hint ? `<div class="metric-hint">${escapeHtml(m.hint)}</div>` : ""}
        </div>
      `
    )
    .join("");

  const list = (items) => asLines(items).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const slides = (report.slides || [])
    .map(
      (slide, idx) => `
        <div class="slide">
          <div class="slide-number">${String(idx + 1).padStart(2, "0")}</div>
          <div>
            <h3>${escapeHtml(slide.title)}</h3>
            <p>${escapeHtml(slide.detail)}</p>
          </div>
        </div>
      `
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    :root { color-scheme: light; --ink: #0f172a; --muted: #64748b; --line: #e2e8f0; --brand: #2563eb; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: #f8fafc; }
    .page { max-width: 980px; margin: 0 auto; padding: 42px 32px 64px; }
    .cover { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 34px; box-shadow: 0 20px 60px rgba(15, 23, 42, .08); }
    .brand { display: flex; align-items: center; gap: 12px; color: var(--brand); font-weight: 800; letter-spacing: .04em; }
    .brand img { width: 42px; height: 42px; }
    h1 { margin: 28px 0 10px; font-size: 42px; line-height: 1.05; letter-spacing: -.02em; }
    h2 { margin: 32px 0 12px; font-size: 22px; }
    h3 { margin: 0 0 6px; font-size: 16px; }
    p { line-height: 1.65; color: #334155; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 24px; }
    .meta div, .metric, .panel, .slide { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .label, .metric-label { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: var(--muted); font-weight: 700; }
    .value, .metric-value { margin-top: 6px; font-size: 18px; font-weight: 800; }
    .metric-hint { margin-top: 6px; color: var(--muted); font-size: 12px; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    ul { margin: 0; padding-left: 20px; color: #334155; line-height: 1.7; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .slide { display: flex; gap: 14px; margin-bottom: 10px; }
    .slide-number { color: var(--brand); font-weight: 900; }
    .footer { margin-top: 34px; color: var(--muted); font-size: 12px; }
    @media print { body { background: #fff; } .page { padding: 0; } .cover, .metric, .panel, .slide { box-shadow: none; } }
    @media (max-width: 760px) { .meta, .metrics, .grid { grid-template-columns: 1fr; } h1 { font-size: 32px; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <div class="brand"><img src="${logo}" alt="RINK" /> RINK GLOBAL SERVICES</div>
      <h1>${escapeHtml(report.title)}</h1>
      <p>${escapeHtml(report.subtitle || "")}</p>
      <div class="meta">
        <div><div class="label">Prepared for</div><div class="value">${escapeHtml(meta.clientName || "Client")}</div></div>
        <div><div class="label">Objective</div><div class="value">${escapeHtml(meta.objective || "Decision support")}</div></div>
        <div><div class="label">Date</div><div class="value">${escapeHtml(meta.date)}</div></div>
      </div>
    </section>

    <h2>Executive Summary</h2>
    <section class="panel"><p>${escapeHtml(report.summary)}</p></section>

    <h2>Key Metrics</h2>
    <section class="metrics">${metricCards}</section>

    <section class="grid">
      <div>
        <h2>Charts To Include</h2>
        <section class="panel"><ul>${list(report.charts)}</ul></section>
      </div>
      <div>
        <h2>Business Insights</h2>
        <section class="panel"><ul>${list(report.insights)}</ul></section>
      </div>
    </section>

    <h2>Recommended Actions</h2>
    <section class="panel"><ul>${list(report.recommendations)}</ul></section>

    <h2>Presentation Outline</h2>
    ${slides}

    <div class="footer">
      Prepared by RINK Global Services. This report is generated from the active workspace result and should be reviewed in business context before final decisions.
    </div>
  </main>
</body>
</html>`;
}

export default function ReportStudio({ report, disabledMessage = "Run an analysis to unlock Report Studio." }) {
  const [clientName, setClientName] = useState("");
  const [objective, setObjective] = useState("");
  const [copied, setCopied] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(null); // null | "saving" | "saved" | "error"

  // Persist a copy of an exported report to encrypted cloud storage. Runs
  // fire-and-forget after the user downloads, so they always get the file even
  // if the upload is slow or offline.
  const saveReport = async (filename, content, type, fmt, title) => {
    try {
      setCloudStatus("saving");
      const fd = new FormData();
      fd.append("file", new Blob([content], { type }), filename);
      if (title) fd.append("title", title);
      if (fmt) fd.append("fmt", fmt);
      await api.post("/api/reports", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCloudStatus("saved");
      setTimeout(() => setCloudStatus(null), 2500);
    } catch {
      setCloudStatus("error");
      setTimeout(() => setCloudStatus(null), 4000);
    }
  };

  const meta = useMemo(
    () => ({
      clientName,
      objective,
      date: new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }),
    [clientName, objective]
  );

  const preparedReport = useMemo(() => {
    if (!report) return null;
    return {
      charts: [],
      insights: [],
      recommendations: [],
      slides: [
        { title: "Objective", detail: "Frame the business question and the data used." },
        { title: "Key Results", detail: "Summarize the strongest metrics and visual evidence." },
        { title: "Recommended Actions", detail: "Translate the analysis into next steps." },
      ],
      ...report,
    };
  }, [report]);

  const copySummary = async () => {
    if (!preparedReport) return;
    await navigator.clipboard.writeText(
      `${preparedReport.title}\n\n${preparedReport.summary}\n\nInsights:\n${asLines(preparedReport.insights)
        .map((x) => `- ${x}`)
        .join("\n")}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadMarkdown = () => {
    if (!preparedReport) return;
    const name = `${slugify(preparedReport.title)}.md`;
    const content = buildMarkdown(preparedReport, meta);
    downloadFile(name, content, "text/markdown;charset=utf-8");
    saveReport(name, content, "text/markdown", "md", preparedReport.title);
  };

  const downloadHtml = () => {
    if (!preparedReport) return;
    const name = `${slugify(preparedReport.title)}.html`;
    const content = buildHtml(preparedReport, meta);
    downloadFile(name, content, "text/html;charset=utf-8");
    saveReport(name, content, "text/html", "html", preparedReport.title);
  };

  // Save the structured report data + AI narrative as JSON so it can be
  // re-rendered later, independent of any single export format.
  const saveJsonBundle = () => {
    if (!preparedReport) return;
    const bundle = { meta, report: preparedReport, savedAt: new Date().toISOString() };
    const name = `${slugify(preparedReport.title)}.json`;
    saveReport(name, JSON.stringify(bundle, null, 2), "application/json", "json", preparedReport.title);
  };

  const printReport = () => {
    if (!preparedReport) return;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(buildHtml(preparedReport, meta));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <Card className="p-6">
      <SectionHeader
        title="Report Studio"
        subtitle="Create a client-ready report and presentation outline from this analysis."
        icon={<Badge tone={preparedReport ? "emerald" : "gray"}>{preparedReport ? "Ready" : "Locked"}</Badge>}
      />

      {!preparedReport ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-gray-400">
          {disabledMessage}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Client / audience
              </span>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name, board, operations team..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Business objective
              </span>
              <input
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Retention planning, demand forecast, route review..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-200">Executive summary</div>
              <p className="mt-2 text-sm leading-6 text-gray-300">{preparedReport.summary}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-purple-200">Presentation flow</div>
              <ol className="mt-2 space-y-1.5 text-sm text-gray-300">
                {preparedReport.slides.slice(0, 4).map((slide, idx) => (
                  <li key={slide.title}>
                    <span className="text-white">{idx + 1}.</span> {slide.title}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(preparedReport.metrics || []).slice(0, 6).map((metric) => (
              <div key={`${metric.label}-${metric.value}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{metric.label}</div>
                <div className="mt-1 text-lg font-bold text-white">{metric.value}</div>
                {metric.hint && <div className="mt-1 text-xs text-gray-500">{metric.hint}</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ReportList title="Charts to generate" items={preparedReport.charts} />
            <ReportList title="Business insights" items={preparedReport.insights} />
            <ReportList title="Recommended actions" items={preparedReport.recommendations} />
            <ReportList title="Report notes" items={preparedReport.notes} />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <Button variant="primary" onClick={downloadHtml}>Download report</Button>
            <Button variant="ghost" onClick={downloadMarkdown}>Export Markdown</Button>
            <Button variant="ghost" onClick={printReport}>Print / save PDF</Button>
            <Button variant="ghost" onClick={saveJsonBundle}>Save to cloud</Button>
            <Button variant="ghost" onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</Button>
            {cloudStatus && (
              <span
                className={`text-xs ${
                  cloudStatus === "error"
                    ? "text-red-300"
                    : cloudStatus === "saved"
                    ? "text-emerald-300"
                    : "text-gray-400"
                }`}
              >
                {cloudStatus === "saving" && "Saving to secure storage…"}
                {cloudStatus === "saved" && "Saved to your encrypted cloud storage ✓"}
                {cloudStatus === "error" && "Couldn't save to cloud (your download still worked)."}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            Downloaded reports are also saved to your encrypted cloud storage and kept for up to 90 days. Delete them anytime from your profile.
          </p>
        </div>
      )}
    </Card>
  );
}

function ReportList({ title, items = [] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</div>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-blue-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No items generated yet.</p>
      )}
    </div>
  );
}
