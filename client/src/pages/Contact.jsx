// =========================
// CONTACT PAGE (CLIENT LEADS)
// File: client/src/pages/Contact.jsx
// =========================

import React, { useState } from "react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Request submitted! We will contact you soon.");
  };

  return (
    <div className="flex justify-center items-center min-h-screen px-4 py-10">
      <form onSubmit={handleSubmit} className="bg-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-md">
        <h2 className="text-2xl mb-4">Contact RINK Global Services</h2>

        <input
          className="w-full mb-3 p-2 bg-black/30 rounded"
          placeholder="Name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="w-full mb-3 p-2 bg-black/30 rounded"
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <textarea
          className="w-full mb-3 p-2 bg-black/30 rounded"
          placeholder="Message"
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />

        <button className="w-full bg-blue-500 py-2 rounded hover:bg-blue-600">
          Submit
        </button>
      </form>
    </div>
  );
}
