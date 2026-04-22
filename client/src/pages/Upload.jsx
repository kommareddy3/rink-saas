import React from "react";


import { useState } from "react";
import axios from "axios";

export default function Upload() {
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);

    await axios.post("http://localhost:5001/upload", formData);
    alert("Dataset uploaded & model trained automatically 🚀");
  };

  return (
    <div className="p-10">
      <h1 className="text-3xl mb-4">Upload Dataset</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        className="bg-blue-500 px-4 py-2 rounded"
      >
        Upload CSV
      </button>
    </div>
  );
}