import { Route } from "react-router-dom";
import Tracker from "../../pages/production/tracker/page/Tracker.jsx"; 
import SFG from "../../pages/production/sfg/page/SFG.jsx";
import MicrobialSFG from "../../pages/microbial/sfg/page/MicrobialSFG.jsx";
import ProductionPage from "../../pages/production/production/page/ProductionPage.jsx";
import PlanningPage from "../../pages/production/planning/page/PlanningPage.jsx";

export const productionRoutes = [
  // <Route key="planning"    path="/planning"    element={
  //   <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
  //     <ProductionPage />
  //   </div>
  // } />,

  <Route key="planning" path="/planning" element={<PlanningPage /> }/>,
  <Route key="production"  path="/production"  element={<ProductionPage />} />,
  <Route key="tracker"     path="/tracker"     element={<Tracker />} />, 
  <Route key="sfg"         path="/sfg"         element={<SFG />} />,
  <Route key="sfg-store"   path="/sfg-store"   element={<MicrobialSFG />} />,
];
