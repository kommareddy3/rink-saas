import React from "react";

// =========================
// Register.jsx
// =========================
import { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {
    await axios.post(`${API_BASE_URL}/auth/register`, { email, password });
    alert("Registered");
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-white/10 backdrop-blur-xl p-10 rounded-2xl w-96 border border-white/20">
        <h2 className="text-2xl mb-6 text-center">Register</h2>
        <input className="w-full p-3 mb-4 rounded bg-black/30" placeholder="Email" onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full p-3 mb-4 rounded bg-black/30" type="password" placeholder="Password" onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full bg-purple-500 py-3 rounded-lg hover:bg-purple-600" onClick={register}>Register</button>
      </div>
    </div>
  );
}