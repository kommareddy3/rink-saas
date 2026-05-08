import React, { useEffect, useState } from "react";
import api from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

function StatusBanner({ status }) {
  if (!status) return null;
  const tone =
    status.kind === "error"
      ? "bg-red-500/20 border-red-500/40 text-red-100"
      : status.kind === "success"
      ? "bg-green-500/20 border-green-500/40 text-green-100"
      : "bg-blue-500/20 border-blue-500/40 text-blue-100";
  return (
    <div className={`mb-4 px-4 py-3 rounded-lg border ${tone}`}>{status.message}</div>
  );
}

export default function Analytics() {
  const [file, setFile] = useState(null);
  const [valuesText, setValuesText] = useState("");
  const [pred, setPred] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [column, setColumn] = useState("value");
  const [metrics, setMetrics] = useState(null);

  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setError = (message) => setStatus({ kind: "error", message });
  const setOk = (message) => setStatus({ kind: "success", message });

  const fetchData = async () => {
    try {
      const res = await api.get("/api/data");
      const values = res.data.data || [];
      setColumn(res.data.column || "value");
      setChartData(
        values.map((val, i) => ({ name: i, actual: val, predicted: null }))
      );
      // Pre-fill the prediction input with the last 7 values for convenience.
      if (values.length >= 7) {
        setValuesText(values.slice(-7).join(", "));
      }
    } catch (err) {
      setError(prettyError(err, "Could not load dataset."));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please choose a CSV file first.");
      return;
    }
    setIsUploading(true);
    setStatus({ kind: "info", message: "Uploading and training…" });
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/api/upload", formData);
      const t = res.data?.training;
      setMetrics(t || null);
      setOk(
        t
          ? `Trained on ${t.rows_used} rows (column "${t.column}"). RMSE ${t.rmse.toFixed(
              4
            )} | MAE ${t.mae.toFixed(4)}.`
          : "Dataset uploaded and model trained."
      );
      await fetchData();
    } catch (err) {
      setError(prettyError(err, "Upload failed."));
    } finally {
      setIsUploading(false);
    }
  };

  const train = async () => {
    setIsTraining(true);
    setStatus({ kind: "info", message: "Training…" });
    try {
      const res = await api.post("/api/train");
      setMetrics(res.data);
      setOk(
        `Model trained on ${res.data.rows_used} rows (column "${res.data.column}"). RMSE ${res.data.rmse.toFixed(
          4
        )} | MAE ${res.data.mae.toFixed(4)}.`
      );
    } catch (err) {
      setError(prettyError(err, "Training failed."));
    } finally {
      setIsTraining(false);
    }
  };

  const predict = async () => {
    const arr = valuesText
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => Number.isFinite(n));

    if (arr.length < 7) {
      setError("Enter at least 7 comma-separated numeric values.");
      return;
    }

    setIsPredicting(true);
    setStatus(null);
    try {
      const res = await api.post("/api/predict", { values: arr, steps: 5 });
      const predictions = res.data.predictions || [];
      setPred(predictions);

      // Stitch predictions onto the actual line so the chart visually connects.
      const next = chartData.map((p) => ({ ...p }));
      const lastActualIdx = next.length - 1;
      if (lastActualIdx >= 0) {
        // Carry the last actual value into a "predicted" point at the same x
        // so Recharts draws a connected segment.
        next[lastActualIdx].predicted = next[lastActualIdx].actual;
      }
      predictions.forEach((p, i) => {
        next.push({
          name: chartData.length + i,
          actual: null,
          predicted: p,
        });
      });
      setChartData(next);
      setOk(`Generated ${predictions.length} forecast steps.`);
    } catch (err) {
      setError(prettyError(err, "Prediction failed."));
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl sm:text-4xl mb-8 text-center">AI Analytics Workspace</h1>

      <StatusBanner status={status} />

      {/* Upload */}
      <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl mb-6 border border-white/20">
        <h2 className="text-2xl mb-4">📤 Upload Dataset</h2>
        <p className="text-gray-300 mb-4">
          Upload a CSV with a numeric column to forecast (e.g. <code>value</code>,{" "}
          <code>price</code>, <code>close</code>). Training runs automatically.
        </p>
        <div className="flex flex-col gap-4 items-stretch sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-white w-full sm:w-auto"
          />
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {isUploading ? "Uploading…" : "Upload & Train"}
          </button>
        </div>
      </div>

      {/* Train */}
      <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl mb-6 border border-white/20">
        <h2 className="text-2xl mb-4">🧠 Model Training</h2>
        <p className="text-gray-300 mb-4">
          Re-train the gradient-boosting model on the current dataset.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={train}
            disabled={isTraining}
            className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {isTraining ? "Training…" : "Train Model"}
          </button>
          {metrics && (
            <span className="text-sm text-gray-300">
              Last run: {metrics.rows_used} rows · RMSE {metrics.rmse?.toFixed(4)} · MAE{" "}
              {metrics.mae?.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Predict */}
      <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl mb-6 border border-white/20">
        <h2 className="text-2xl mb-4">🔮 Make Predictions</h2>
        <p className="text-gray-300 mb-4">
          Enter at least 7 recent values (comma-separated) to forecast the next 5 steps.
        </p>
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
          <input
            placeholder="e.g. 1.2, 3.4, 2.1, 4.5, 3.2, 4.8, 5.1"
            value={valuesText}
            onChange={(e) => setValuesText(e.target.value)}
            className="flex-1 p-3 rounded bg-black/30 text-white placeholder-gray-400 w-full"
          />
          <button
            onClick={predict}
            disabled={isPredicting}
            className="bg-purple-500 hover:bg-purple-600 px-6 py-3 rounded-lg disabled:opacity-50"
          >
            {isPredicting ? "Predicting…" : "Predict"}
          </button>
        </div>
        {pred && (
          <div className="bg-black/30 p-4 rounded">
            <h3 className="text-lg mb-2">Predictions:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {pred.map((p, i) => (
                <div key={i} className="text-center p-2 bg-purple-500/20 rounded">
                  <div className="text-sm text-gray-300">Step {i + 1}</div>
                  <div className="font-bold">{p.toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20">
        <h2 className="text-2xl mb-4">📊 Data Visualization</h2>
        <p className="text-gray-300 mb-4">
          Showing column <code>{column}</code> — actual data and forecasts.
        </p>
        {chartData.length > 0 ? (
          <div className="w-full h-[320px] sm:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                />
                <Legend wrapperStyle={{ color: "#D1D5DB" }} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-gray-400">
            No data available. Upload a dataset to get started.
          </p>
        )}
      </div>
    </div>
  );
}

function prettyError(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data?.error) return data.error;
  if (data?.detail) return Array.isArray(data.detail) ? JSON.stringify(data.detail) : data.detail;
  if (err?.message) return err.message;
  return fallback;
}
