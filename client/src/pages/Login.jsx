// Deprecated: authentication is handled by Auth.jsx via Supabase.
// This file is kept only to avoid breaking imports; it is not routed.
import React from "react";
import { Navigate } from "react-router-dom";

export default function Login() {
  return <Navigate to="/auth" replace />;
}
