import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

export default function Analytics() {
  const [file, setFile] = useState(null);
  const [values, setValues] = useState("");
  const [pred, setPred] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/data`);
      const values = res.data.data;

      let formatted = values.map((val, i) => ({
        name: i,
        actual: val,
        predicted: null,
      }));

      setChartData(formatted);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await axios.post(`${API_BASE_URL}/upload`, formData);
      alert("Dataset uploaded & model trained automatically 🚀");
      await fetchData(); // Refresh chart data
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const train = async () => {
    setIsTraining(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/train`);
      alert(`Model trained! RMSE: ${res.data.rmse} | MAE: ${res.data.mae}`);
    } catch (err) {
      console.error(err);
      alert("Training failed");
    } finally {
      setIsTraining(false);
    }
  };

  const predict = async () => {
    if (!values.trim()) {
      alert("Please enter values for prediction");
      return;
    }

    setIsPredicting(true);
    try {
      const arr = values.split(",").map(Number);

      const res = await axios.post(`${API_BASE_URL}/predict`, {
        values: arr,
        steps: 5,
      });

      setPred(res.data.predictions);

      // Update chart with predictions
      const last5 = chartData.slice(-5);
      const predictions = res.data.predictions;

      let updatedChart = [...chartData];

      predictions.forEach((p, i) => {
        updatedChart.push({
          name: chartData.length + i,
          actual: null,
          predicted: p,
        });
      });

      setChartData(updatedChart);
    } catch (err) {
      console.error(err);
      alert("Prediction failed");
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl sm:text-4xl mb-10 text-center">AI Analytics Workspace</h1>

      {/* Upload Section */}
      <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl mb-8 border border-white/20">
        <h2 className="text-2xl mb-4">📤 Upload Dataset</h2>
        <p className="text-gray-300 mb-4">Upload a CSV file to update your dataset and automatically train the model</p>
        <div className="flex flex-col gap-4 items-stretch sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-white w-full sm:w-auto"
          />
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload & Train"}
          </button>
        </div>
      </div>

      {/* Model Training Section */}
      <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl mb-8 border border-white/20">
        <h2 className="text-2xl mb-4">🧠 Model Training</h2>
        <p className="text-gray-300 mb-4">Train your LSTM model on the current dataset</p>
        <button
          onClick={train}
          disabled={isTraining}
          className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg disabled:opacity-50"
        >
          {isTraining ? "Training..." : "Train Model"}
        </button>
      </div>

      {/* Prediction Section */}
      <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl mb-8 border border-white/20">
        <h2 className="text-2xl mb-4">🔮 Make Predictions</h2>
        <p className="text-gray-300 mb-4">Enter the last 5 values (comma-separated) to predict the next 5 steps</p>
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
          <input
            placeholder="e.g., 1.2, 3.4, 2.1, 4.5, 3.2"
            value={values}
            onChange={(e) => setValues(e.target.value)}
            className="flex-1 p-3 rounded bg-black/30 text-white placeholder-gray-400 w-full"
          />
          <button
            onClick={predict}
            disabled={isPredicting}
            className="bg-purple-500 hover:bg-purple-600 px-6 py-3 rounded-lg disabled:opacity-50"
          >
            {isPredicting ? "Predicting..." : "Predict"}
          </button>
        </div>
        {pred && (
          <div className="bg-black/30 p-4 rounded">
            <h3 className="text-lg mb-2">Predictions:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {pred.map((p, i) => (
                <div key={i} className="text-center p-2 bg-purple-500/20 rounded">
                  <div className="text-sm text-gray-300">Step {i+1}</div>
                  <div className="font-bold">{p.toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visualization Section */}
      <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20">
        <h2 className="text-2xl mb-4">📊 Data Visualization</h2>
        <p className="text-gray-300 mb-4">View your actual data and predictions</p>
        {chartData.length > 0 ? (
          <div className="w-full h-[320px] sm:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-gray-400">No data available. Upload a dataset to get started.</p>
        )}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-blue-500"></div>
            <span>Actual Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-green-500 opacity-60" style={{borderStyle: 'dashed'}}></div>
            <span>Predictions</span>
          </div>
        </div>
      </div>
    </div>
  );
}