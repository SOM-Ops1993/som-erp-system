import { Route } from "react-router-dom";
import ProductionPage from "../../pages/production/planning/page/ProductionPage.jsx";
import Tracker from "../../pages/production/tracker/page/Tracker.jsx";
import Production from "../../pages/production/batch/page/Production.jsx";
import SFG from "../../pages/production/sfg/page/SFG.jsx";
import MicrobialSFG from "../../pages/microbial/sfg/page/MicrobialSFG.jsx";

export const productionRoutes = [
  <Route key="planning"    path="/planning"    element={
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      <ProductionPage />
    </div>
  } />,
  <Route key="tracker"     path="/tracker"     element={<Tracker />} />,
  <Route key="production"  path="/production"  element={<Production />} />,
  <Route key="sfg"         path="/sfg"         element={<SFG />} />,
  <Route key="sfg-store"   path="/sfg-store"   element={<MicrobialSFG />} />,
];
