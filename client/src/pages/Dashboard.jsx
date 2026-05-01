import React from "react";

// =========================
// Dashboard.jsx
// =========================
import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

export default function Dashboard() {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
  try {
    // 1. Get actual data
    const res = await axios.get(`${API_BASE_URL.replace('/api', '')}/data`);
    const values = res.data.data;

    // 2. Get prediction (last 5 values)
    const last5 = values.slice(-5);

    const predRes = await axios.post(`${API_BASE_URL.replace('/api', '')}/predict`, {
      values: last5,
      steps: 5,
    });

    const predictions = predRes.data.predictions;

    // 3. Format actual data
    let formatted = values.map((val, i) => ({
      name: i,
      actual: val,
      predicted: null,
    }));

    // 4. Append predictions AFTER actual data
    predictions.forEach((p, i) => {
      formatted.push({
        name: values.length + i,
        actual: null,
        predicted: p,
      });
    });

    setChartData(formatted);
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className="p-10">
      <h1 className="text-4xl mb-10">AI Analytics Dashboard</h1>

      <LineChart width={700} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="actual" stroke="#3b82f6" />
        <Line type="monotone" dataKey="predicted" stroke="#22c55e" />
      </LineChart>
    </div>
  );
}