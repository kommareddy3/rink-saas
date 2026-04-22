import React from "react";

// =========================
// Home.jsx (Landing Page)
// =========================
export default function Home() {
  return (
    <div className="text-center px-6 py-20">
      <h1 className="text-6xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        RINK
      </h1>
      <p className="mt-6 text-xl text-gray-300 max-w-2xl mx-auto">
        Research Innovation & Next-gen Knowledge platform transforming AI, Machine Learning, and future technologies into real-world SaaS solutions.
      </p>

      <div className="mt-10 space-x-4">
        <a href="/register" className="px-6 py-3 bg-blue-500 rounded-xl shadow-lg hover:bg-blue-600">
          Get Started
        </a>
        <a href="/dashboard" className="px-6 py-3 border border-white/30 rounded-xl hover:bg-white/10">
          Live Demo
        </a>
      </div>

      {/* Feature Section */}
      <div className="grid md:grid-cols-3 gap-8 mt-20">
        {[
          "AI Solutions",
          "Machine Learning Models",
          "Cloud SaaS Architecture"
        ].map((item, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20">
            <h3 className="text-xl font-semibold">{item}</h3>
            <p className="text-gray-400 mt-2">Next-gen scalable intelligent systems</p>
          </div>
        ))}
      </div>
    </div>
  );
}