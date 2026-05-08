// Deprecated: registration is handled by Auth.jsx via Supabase.
// This file is kept only to avoid breaking imports; it is not routed.
import React from "react";
import { Navigate } from "react-router-dom";

export default function Register() {
  return <Navigate to="/auth" replace />;
}
