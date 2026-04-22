import React from "react";

import axios from "axios";
import { useState } from "react";

export default function ML() {
  const [values, setValues] = useState("");
  const [pred, setPred] = useState(null);

const train = async () => {
  const res = await axios.post("http://localhost:5001/train");

  alert(`RMSE: ${res.data.rmse} | MAE: ${res.data.mae}`);
};

const predict = async () => {
  const arr = values.split(",").map(Number);

  const res = await axios.post("http://localhost:5001/predict", {
    values: arr,
    steps: 5,
  });

  setPred(res.data.predictions);
};

  return (
    <div className="p-10">
      <h1 className="text-3xl mb-4">ML Prediction (LSTM)</h1>

      <button onClick={train} className="bg-blue-500 px-4 py-2 rounded">
        Train Model
      </button>

      <div className="mt-4">
        <input
          placeholder="Enter last 5 values (comma separated)"
          onChange={(e) => setValues(e.target.value)}
          className="p-2 text-black"
        />
        <button onClick={predict} className="ml-2 bg-green-500 px-4 py-2 rounded">
          Predict
        </button>
      </div>

      {pred && pred.map((p, i) => (
  <p key={i}>Step {i+1}: {p}</p>
))}
    </div>
  );
}