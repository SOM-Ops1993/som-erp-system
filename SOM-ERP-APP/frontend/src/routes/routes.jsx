import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import AppSidebar from "../components/menu-bar/page/menu-bar.jsx";
import Login from "../pages/erp/Login.jsx";
import { useApp } from "../context/context.jsx";
import { operationForPath, DEFAULT_PATH_FOR_OPERATION } from "./operationMap.js";

import { dashboardRoutes } from "./modules/dashboardRoutes.jsx";
import { masterRoutes }    from "./modules/masterRoutes.jsx";
import { inventoryRoutes } from "./modules/inventoryRoutes.jsx";
import { salesRoutes }     from "./modules/salesRoutes.jsx";
import { productionRoutes } from "./modules/productionRoutes.jsx";
import { qualityRoutes }   from "./modules/qualityRoutes.jsx";
import { reportsRoutes }   from "./modules/reportsRoutes.jsx";
import { erpRoutes }       from "./modules/erpRoutes.jsx";

function AccessDenied({ operation }) {
  return (
    <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
      <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔒</div>
      <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>Access denied</div>
      <div style={{ fontSize: "13px" }}>Your account isn't set up for the <b>{operation}</b> operation.</div>
    </div>
  );
}

function AppLayout() {
  const { user } = useApp();
  const location = useLocation();
  const defaultPath = DEFAULT_PATH_FOR_OPERATION[user?.operation] || "/stock";

  // The shared dashboard ("/") is admin-only now — send everyone else
  // straight to their own operation's landing page instead of erroring.
  if (location.pathname === "/") {
    return <Navigate to={defaultPath} replace />;
  }

  const requiredOp = operationForPath(location.pathname);
  const allowed = !requiredOp || !user || user.operation === "admin" || user.operation === requiredOp;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <AppSidebar />
      <main style={{ flex: 1, overflowY: "auto", background: "#f1f5f9" }}>
        {allowed ? (
          <Routes>
            {dashboardRoutes}
            {masterRoutes}
            {inventoryRoutes}
            {salesRoutes}
            {productionRoutes}
            {qualityRoutes}
            {reportsRoutes}
            {erpRoutes}
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Routes>
        ) : (
          <AccessDenied operation={requiredOp} />
        )}
      </main>
    </div>
  );
}

export default function AppRoutes() {
  const { user } = useApp();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={user ? <AppLayout /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
