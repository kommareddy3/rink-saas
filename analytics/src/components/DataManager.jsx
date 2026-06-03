import React, { useCallback, useEffect, useState } from "react";
import api from "../api";
import { Badge, Button, Card, SectionHeader } from "./ToolUI";

function formatBytes(n) {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Unified "My data" manager: lists the user's uploaded dataset library and
 * their stored reports from the encrypted bucket. Supports activating a
 * dataset for analysis, downloading reports, deleting individual items, and
 * deleting everything.
 *
 * Props:
 *   onActivated()  optional — called after a dataset is activated + re-trained
 *                  so the parent workspace can refresh its view.
 *   compact        optional — tighter layout for embedding in the workspace.
 */
export default function DataManager({ onActivated, compact = false }) {
  const [datasets, setDatasets] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null); // id currently acting on

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, r] = await Promise.all([
        api.get("/api/datasets"),
        api.get("/api/reports"),
      ]);
      setDatasets(d.data?.datasets || []);
      setReports(r.data?.reports || []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Couldn't load your data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const activate = async (file_id) => {
    setBusyId(file_id);
    try {
      await api.post(`/api/datasets/${file_id}/activate`);
      await refresh();
      onActivated?.();
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't activate that file.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteDataset = async (file_id) => {
    if (!window.confirm("Delete this file from the bucket? This cannot be undone.")) return;
    setBusyId(file_id);
    try {
      await api.delete(`/api/datasets/${file_id}`);
      await refresh();
      onActivated?.();
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't delete that file.");
    } finally {
      setBusyId(null);
    }
  };

  const downloadReport = async (report_id, filename) => {
    setBusyId(report_id);
    try {
      const res = await api.get(`/api/reports/${report_id}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "report";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't download that report.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteReport = async (report_id) => {
    if (!window.confirm("Delete this report from the bucket? This cannot be undone.")) return;
    setBusyId(report_id);
    try {
      await api.delete(`/api/reports/${report_id}`);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't delete that report.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteAllDatasets = async () => {
    if (!window.confirm("Delete ALL uploaded files from the bucket? This cannot be undone.")) return;
    setBusyId("all-datasets");
    try {
      await api.delete("/api/datasets");
      await refresh();
      onActivated?.();
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't delete your files.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteEverything = async () => {
    if (!window.confirm("Permanently delete ALL your data — every uploaded file AND every report? This cannot be undone.")) return;
    setBusyId("all");
    try {
      await api.delete("/api/user-data");
      await refresh();
      onActivated?.();
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't delete your data.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className={compact ? "p-5" : "p-6"}>
      <SectionHeader
        title="My data"
        subtitle="Your uploaded files and saved reports, stored encrypted and kept for up to 90 days."
        action={
          <Button variant="ghost" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Datasets */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            Uploaded files ({datasets.length})
          </h4>
          {datasets.length > 0 && (
            <button
              onClick={deleteAllDatasets}
              disabled={busyId === "all-datasets"}
              className="text-xs text-red-300 hover:text-red-200 disabled:opacity-50"
            >
              Delete all files
            </button>
          )}
        </div>
        {datasets.length === 0 ? (
          <EmptyRow text={loading ? "Loading…" : "No files uploaded yet."} />
        ) : (
          <ul className="space-y-2">
            {datasets.map((d) => (
              <li
                key={d.file_id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <FileIcon />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{d.filename}</span>
                    {d.active && <Badge tone="emerald">Active</Badge>}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatBytes(d.size)}
                    {Number.isFinite(d.rows) ? ` · ${d.rows.toLocaleString()} rows` : ""}
                    {d.created_at ? ` · ${formatDate(d.created_at)}` : ""}
                  </div>
                </div>
                {!d.active && (
                  <button
                    onClick={() => activate(d.file_id)}
                    disabled={busyId === d.file_id}
                    className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-100 hover:bg-blue-500/20 disabled:opacity-50"
                  >
                    {busyId === d.file_id ? "Working…" : "Use for analysis"}
                  </button>
                )}
                <button
                  onClick={() => deleteDataset(d.file_id)}
                  disabled={busyId === d.file_id}
                  className="rounded-lg p-1 text-gray-400 hover:text-red-300 disabled:opacity-50"
                  aria-label={`Delete ${d.filename}`}
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reports */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-200">
          Saved reports ({reports.length})
        </h4>
        {reports.length === 0 ? (
          <EmptyRow text={loading ? "Loading…" : "No reports saved yet."} />
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li
                key={r.report_id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <FileIcon />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{r.title || r.filename}</div>
                  <div className="text-xs text-gray-400">
                    {(r.fmt || "").toUpperCase()} · {formatBytes(r.size)}
                    {r.created_at ? ` · ${formatDate(r.created_at)}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => downloadReport(r.report_id, r.filename)}
                  disabled={busyId === r.report_id}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-100 hover:bg-white/10 disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  onClick={() => deleteReport(r.report_id)}
                  disabled={busyId === r.report_id}
                  className="rounded-lg p-1 text-gray-400 hover:text-red-300 disabled:opacity-50"
                  aria-label="Delete report"
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(datasets.length > 0 || reports.length > 0) && (
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-[11px] text-gray-500">
            Files are auto-deleted after 90 days. Delete sooner anytime.
          </span>
          <Button variant="danger" onClick={deleteEverything} disabled={busyId === "all"}>
            {busyId === "all" ? "Deleting…" : "Delete all my data"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function EmptyRow({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}

function FileIcon() {
  return (
    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/5 text-gray-300">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </span>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
