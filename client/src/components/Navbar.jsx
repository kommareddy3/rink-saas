import React from "react";

// =========================
// Navbar.jsx
// =========================
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div className="flex justify-between items-center px-8 py-4 bg-white/10 backdrop-blur-lg border-b border-white/20">
      <h1 className="text-2xl font-bold text-blue-400">RINK</h1>
      <div className="space-x-6">
        <Link to="/" className="hover:text-blue-400">Home</Link>
        <Link to="/login" className="hover:text-blue-400">Login</Link>
        <Link to="/register" className="hover:text-blue-400">Register</Link>
        <Link to="/dashboard" className="hover:text-blue-400">Dashboard</Link>
        <Link to="/ml" className="hover:text-blue-400">ML</Link>
        <Link to="/upload">Upload</Link>
      </div>
    </div>
  );
}