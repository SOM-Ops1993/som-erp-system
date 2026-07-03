import { Route } from "react-router-dom";
import RmMaster from "../../pages/masters/rm/page/RmMaster.jsx";
import ProductMaster from "../../pages/masters/product/page/ProductMaster.jsx";
import EquipmentMaster from "../../pages/masters/equipment/page/EquipmentMaster.jsx";
import LocationMaster from "../../pages/masters/location/page/LocationMaster.jsx";
import MicrobesMaster from "../../pages/masters/microbes/page/MicrobesMaster.jsx";
import RecipeDB from "../../pages/masters/recipe/page/RecipeDB.jsx";
import PrintMaster from "../../pages/inventory/print-master/page/PrintMaster.jsx";
import PackEntries from "../../pages/inventory/print-master/page/PackEntries.jsx";
import ReturnMaterial from "../../pages/inventory/print-master/page/ReturnMaterial.jsx";
import EmployeeMaster from "../../pages/hr/employee/page/EmployeeMaster.jsx";
import PackingMaster from "../../pages/masters/packing/page/PackingMaster.jsx";

export const masterRoutes = [
  <Route key="rm-master"        path="/rm-master"        element={<RmMaster />} />,
  <Route key="product-master"   path="/product-master"   element={<ProductMaster />} />,
  <Route key="equipment-master" path="/equipment-master" element={<EquipmentMaster />} />,
  <Route key="print-master"         path="/print-master"                element={<PrintMaster />} />,
  <Route key="print-master-entries" path="/print-master/entries"        element={<PackEntries />} />,
  <Route key="print-master-return"  path="/print-master/return-material" element={<ReturnMaterial />} />,
  <Route key="microbes-master"  path="/microbes-master"  element={<MicrobesMaster />} />,
  <Route key="employee-master"  path="/employee-master"  element={<EmployeeMaster />} />,
  <Route key="recipe"           path="/recipe"           element={<RecipeDB />} />,
  <Route key="location-master"  path="/location-master"  element={<LocationMaster />} />,
  <Route key="packing-master"   path="/packing-master"   element={<PackingMaster />} />,
];
