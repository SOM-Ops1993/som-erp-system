import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { runEngine, listPlans, getPlan, patchPlan, cancelPlan, listLogs, getDashboard, listPendingOrders } from "./plan-engine/plan-engine.controller.js";
import { analyseOrder, createPlan, listErpPlans, getErpPlan, submitPlan, publishPlan, startJob, delayJob, recordQc, logTimeMotion, listTimeMotion } from "./planning.controller.js";
import { getPlannerQueue } from "./update/planning.controller.js";

const PlanningRouter = express.Router();
const plannerOrAbove = authorize(["planner", "planning_manager", "admin"]);
const managerOrAbove = authorize(["planning_manager", "admin"]);
const supervisorOrAbove = authorize(["plant_supervisor", "planning_manager", "admin"]);

// ── Plan Engine (Prisma-based production planning) ─────────────────────────────
PlanningRouter.post("/plan-engine/run", authenticate, managerOrAbove, runEngine);
PlanningRouter.get("/plan-engine/dashboard", authenticate, plannerOrAbove, getDashboard);
PlanningRouter.get("/plan-engine/pending-orders", authenticate, plannerOrAbove, listPendingOrders);
PlanningRouter.get("/plan-engine/logs", authenticate, plannerOrAbove, listLogs);
PlanningRouter.get("/plan-engine/plans", authenticate, plannerOrAbove, listPlans);
PlanningRouter.get("/plan-engine/plans/:id", authenticate, plannerOrAbove, getPlan);
PlanningRouter.patch("/plan-engine/plans/:id", authenticate, plannerOrAbove, patchPlan);
PlanningRouter.delete("/plan-engine/plans/:id", authenticate, managerOrAbove, cancelPlan);

// ── ERP Planning (legacy SQL-based planning workflow) ─────────────────────────
PlanningRouter.post("/erp/planning/analyse", authenticate, plannerOrAbove, analyseOrder);
PlanningRouter.get("/erp/planning/time-motion", authenticate, plannerOrAbove, listTimeMotion);
PlanningRouter.post("/erp/planning/time-motion", authenticate, supervisorOrAbove, logTimeMotion);
PlanningRouter.get("/erp/planning/plans", authenticate, plannerOrAbove, listErpPlans);
PlanningRouter.post("/erp/planning/plans", authenticate, plannerOrAbove, createPlan);
PlanningRouter.get("/erp/planning/plans/:id", authenticate, plannerOrAbove, getErpPlan);
PlanningRouter.patch("/erp/planning/plans/:id/submit", authenticate, plannerOrAbove, submitPlan);
PlanningRouter.patch("/erp/planning/plans/:id/publish", authenticate, managerOrAbove, publishPlan);
PlanningRouter.patch("/erp/planning/jobs/:id/start", authenticate, supervisorOrAbove, startJob);
PlanningRouter.patch("/erp/planning/jobs/:id/delay", authenticate, supervisorOrAbove, delayJob);
PlanningRouter.post("/erp/planning/jobs/:id/qc", authenticate, supervisorOrAbove, recordQc);

// ── Sales Planner Queue ────────────────────────────────────────────────────────
PlanningRouter.get("/sales/planner-queue", authenticate, plannerOrAbove, getPlannerQueue);

export default PlanningRouter;
