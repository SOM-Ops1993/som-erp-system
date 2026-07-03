import express from "express";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { listErpPlans, getErpPlan, listTimeMotion, getPlannerQueue } from "./get/planning.controller.js";
import { analyseOrder, createPlan, logTimeMotion, recordQc } from "./create/planning.controller.js";
import { submitPlan, publishPlan, startJob, delayJob } from "./update/planning.controller.js";

const ErpPlanningRouter = express.Router();
const plannerOrAbove = authorize(["production"]);
const managerOrAbove = authorize(["production"]);
const supervisorOrAbove = authorize(["production"]);

ErpPlanningRouter.post("/planning/analyse", authenticate, plannerOrAbove, analyseOrder);
ErpPlanningRouter.get("/planning/time-motion", authenticate, plannerOrAbove, listTimeMotion);
ErpPlanningRouter.post("/planning/time-motion", authenticate, supervisorOrAbove, logTimeMotion);
ErpPlanningRouter.get("/planning/plans", authenticate, plannerOrAbove, listErpPlans);
ErpPlanningRouter.post("/planning/plans", authenticate, plannerOrAbove, createPlan);
ErpPlanningRouter.get("/planning/plans/:id", authenticate, plannerOrAbove, getErpPlan);
ErpPlanningRouter.patch("/planning/plans/:id/submit", authenticate, plannerOrAbove, submitPlan);
ErpPlanningRouter.patch("/planning/plans/:id/publish", authenticate, managerOrAbove, publishPlan);
ErpPlanningRouter.patch("/planning/jobs/:id/start", authenticate, supervisorOrAbove, startJob);
ErpPlanningRouter.patch("/planning/jobs/:id/delay", authenticate, supervisorOrAbove, delayJob);
ErpPlanningRouter.post("/planning/jobs/:id/qc", authenticate, supervisorOrAbove, recordQc);

ErpPlanningRouter.get("/sales/planner-queue", authenticate, plannerOrAbove, getPlannerQueue);

export default ErpPlanningRouter;
