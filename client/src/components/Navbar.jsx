import React from "react";

// =========================
// Navbar.jsx
// =========================
import { Link } from "react-router-dom";
import logo from "../assets/rink-logo.png";

export default function Navbar() {
  return (
    
    <div className="flex justify-between items-center px-8 py-4 bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="flex items-center gap-2">
        <img src={logo} className="h-10" />
        <span className="font-bold text-xl">RINK</span>
      </div>
      <div className="space-x-6">
        <Link to="/" className="hover:text-blue-400">Home</Link>
        <Link to="/auth" className="hover:text-blue-400">Auth</Link>
        <Link to="/analytics" className="hover:text-blue-400">Analytics</Link>
        <Link to="/contact">Contact</Link>
      </div>
    </div>
  );
}