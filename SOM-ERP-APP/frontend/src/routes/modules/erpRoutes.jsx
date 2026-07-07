import { Route, Navigate } from "react-router-dom";
// import GateEntry from "../../pages/erp/GateEntry.jsx";
// import InventoryManagement from "../../pages/erp/InventoryManagement.jsx";
import BomIssuance from "../../pages/erp/BomIssuance.jsx";
import PlanningPage from "../../pages/production/planning/page/PlanningPage.jsx";
// import SalesOrders from "../../pages/erp/SalesOrders.jsx";
import MicrobialManagement from "../../pages/erp/MicrobialManagement.jsx";

export const erpRoutes = [
  <Route
    key="erp-root"
    path="/erp"
    element={<Navigate to="/erp/gate" replace />}
  />,
  // <Route key="erp-gate"      path="/erp/gate"       element={<GateEntry />} />,
  // <Route
  //   key="erp-inventory"
  //   path="/erp/inventory"
  //   element={<InventoryManagement />}
  // />,
  <Route
    key="erp-microbial"
    path="/erp/microbial"
    element={<MicrobialManagement />}
  />,
  <Route key="erp-bom" path="/erp/bom" element={<BomIssuance />} />,
 
  // <Route key="erp-sales" path="/erp/sales" element={<SalesOrders />} />,
];
