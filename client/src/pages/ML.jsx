// Deprecated: ML controls live in Analytics.jsx.
// This file is kept only to avoid breaking imports; it is not routed.
import React from "react";
import { Navigate } from "react-router-dom";

export default function ML() {
  return <Navigate to="/analytics" replace />;
}
