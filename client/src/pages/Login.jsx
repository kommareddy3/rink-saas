import React from "react";

// =========================
// Login.jsx
// =========================
import { useState } from "react";
import axios from "axios";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await axios.post("http://localhost:5001/api/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    alert("Logged in");
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-white/10 backdrop-blur-xl p-10 rounded-2xl w-96 border border-white/20">
        <h2 className="text-2xl mb-6 text-center">Login</h2>
        <input className="w-full p-3 mb-4 rounded bg-black/30" placeholder="Email" onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full p-3 mb-4 rounded bg-black/30" type="password" placeholder="Password" onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full bg-blue-500 py-3 rounded-lg hover:bg-blue-600" onClick={login}>Login</button>
      </div>
    </div>
  );
}