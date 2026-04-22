// =========================
// LANDING PAGE UI (PRO SaaS)
// File: client/src/pages/Home.jsx
// =========================

import React from "react";
import logo from "../assets/rink-logo.png";

export default function Home() {
  return (
    <div className="text-white">
      {/* HERO SECTION */}
      <section className="text-center py-24 px-6">
        
        <div className="flex flex-col items-center">
          <img src={logo} className="h-20 mb-4" />
          <h1 className="text-5xl font-bold">RINK</h1>
        </div>
        <p className="mt-6 text-xl text-gray-300 max-w-2xl mx-auto">
          Research Innovation & Next-gen Knowledge — AI-powered consulting and SaaS platform for intelligent decision-making.
        </p>

        <div className="mt-10 space-x-4">
          <a href="/register" className="px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 shadow-lg">
            Get Started
          </a>
          <a href="/contact" className="px-6 py-3 border border-white/30 rounded-xl hover:bg-white/10">
            Contact Us
          </a>
        </div>
      </section>

      {/* SERVICES */}
      <section className="grid md:grid-cols-3 gap-8 px-10 py-20">
        {[
          "AI Consulting",
          "Machine Learning Solutions",
          "Data Analytics"
        ].map((item, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20">
            <h3 className="text-xl font-semibold">{item}</h3>
            <p className="text-gray-400 mt-2">
              Delivering intelligent, scalable solutions for modern businesses.
            </p>
          </div>
        ))}
      </section>

      {/* CLIENT PORTAL CTA */}
      <section className="text-center py-20">
        <h2 className="text-3xl font-bold">Client Intelligence Portal</h2>
        <p className="text-gray-400 mt-4">
          Upload data, train models, and get predictions in real-time.
        </p>
        <a href="/dashboard" className="mt-6 inline-block px-6 py-3 bg-purple-500 rounded-xl hover:bg-purple-600">
          Go to Dashboard
        </a>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-10 border-t border-white/20 text-gray-400">
        © {new Date().getFullYear()} RINK — AI Consulting & SaaS Platform
      </footer>
    </div>
  );
}
