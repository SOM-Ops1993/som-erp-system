import { Route } from "react-router-dom";
import PlanningPage from "../../pages/planning/page/Planning.jsx";
import Tracker from "../../pages/production/tracker/page/Tracker.jsx";
import Production from "../../pages/production/batch/page/Production.jsx";
import SFG from "../../pages/production/sfg/page/SFG.jsx";
import MicrobialSFG from "../../pages/microbial/sfg/page/MicrobialSFG.jsx";

export const productionRoutes = [
  <Route key="planning"    path="/planning"    element={<PlanningPage />} />,
  <Route key="tracker"     path="/tracker"     element={<Tracker />} />,
  <Route key="production"  path="/production"  element={<Production />} />,
  <Route key="sfg"         path="/sfg"         element={<SFG />} />,
  <Route key="sfg-store"   path="/sfg-store"   element={<MicrobialSFG />} />,
];
