import { Route } from "react-router-dom";
import Import from "../../pages/inventory/import/page/Import.jsx";

export const reportsRoutes = [
  <Route key="import" path="/import" element={<Import />} />,
];
