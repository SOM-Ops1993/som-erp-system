import { Routes, Route, Navigate } from "react-router-dom";

import AppSidebar from "../components/menu-bar/page/menu-bar.jsx";

import { dashboardRoutes } from "./modules/dashboardRoutes.jsx";
import { masterRoutes }    from "./modules/masterRoutes.jsx";
import { inventoryRoutes } from "./modules/inventoryRoutes.jsx";
import { salesRoutes }     from "./modules/salesRoutes.jsx";
import { productionRoutes } from "./modules/productionRoutes.jsx";
import { qualityRoutes }   from "./modules/qualityRoutes.jsx";
import { reportsRoutes }   from "./modules/reportsRoutes.jsx";
import { erpRoutes }       from "./modules/erpRoutes.jsx";

function AppLayout() {
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
        <Routes>
          {dashboardRoutes}
          {masterRoutes}
          {inventoryRoutes}
          {salesRoutes}
          {productionRoutes}
          {qualityRoutes}
          {reportsRoutes}
          {erpRoutes}
          <Route path="*" element={<Navigate to="/stock" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  );
}
