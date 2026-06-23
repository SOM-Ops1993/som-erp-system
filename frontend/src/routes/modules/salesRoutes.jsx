import { Route } from "react-router-dom";
import SalesOrder from "../../pages/sales/sales-order/page/sales-order.jsx";

export const salesRoutes = [
  <Route key="sales-orders" path="/sales-orders" element={<SalesOrder />} />,
];
