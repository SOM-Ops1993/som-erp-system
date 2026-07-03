import express from "express";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { listPlans, getPlan, listLogs, getDashboard, listPendingOrders } from "./get/plan-engine.controller.js";
import { runEngine } from "./create/plan-engine.controller.js";
import { patchPlan } from "./update/plan-engine.controller.js";
import { cancelPlan } from "./delete/plan-engine.controller.js";

const PlanEngineRouter = express.Router();
const plannerOrAbove = authorize(["production"]);
const managerOrAbove = authorize(["production"]);

PlanEngineRouter.post("/plan-engine/run", authenticate, managerOrAbove, runEngine);
PlanEngineRouter.get("/plan-engine/dashboard", authenticate, plannerOrAbove, getDashboard);
PlanEngineRouter.get("/plan-engine/pending-orders", authenticate, plannerOrAbove, listPendingOrders);
PlanEngineRouter.get("/plan-engine/logs", authenticate, plannerOrAbove, listLogs);
PlanEngineRouter.get("/plan-engine/plans", authenticate, plannerOrAbove, listPlans);
PlanEngineRouter.get("/plan-engine/plans/:id", authenticate, plannerOrAbove, getPlan);
PlanEngineRouter.patch("/plan-engine/plans/:id", authenticate, plannerOrAbove, patchPlan);
PlanEngineRouter.delete("/plan-engine/plans/:id", authenticate, managerOrAbove, cancelPlan);

export default PlanEngineRouter;
