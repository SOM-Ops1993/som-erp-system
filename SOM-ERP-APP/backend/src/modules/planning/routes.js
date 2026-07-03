import express from "express";
import PlanEngineRouter from "./plan-engine/router.js";
import ErpPlanningRouter from "./erp-planning/router.js";

const PlanningRouter = express.Router();
PlanningRouter.use("/", PlanEngineRouter);
PlanningRouter.use("/", ErpPlanningRouter);

export default PlanningRouter;
