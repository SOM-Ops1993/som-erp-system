import { Route, Navigate } from "react-router-dom";
import Stock from "../../pages/inventory/store/stock/page/Stock.jsx";
import RmMaterial from "../../pages/inventory/rm-material/RmMaterial.jsx";
import RmMaterialDetail from "../../pages/inventory/rm-material/RmMaterialDetail.jsx";

export const dashboardRoutes = [
  <Route key="root"            path="/"                      element={<Navigate to="/stock" replace />} />,
  <Route key="stock"           path="/stock"                 element={<Stock />} />,
  <Route key="rm-material"     path="/rm-material"           element={<RmMaterial />} />,
  <Route key="rm-material-det" path="/rm-material/:itemCode" element={<RmMaterialDetail />} />,
];
