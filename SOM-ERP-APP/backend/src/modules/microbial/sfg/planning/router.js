import express from "express";
import { authenticate } from "../../../../middleware/auth.js";
import { checkPlanMicrobes, getAllocationsForPlan } from "./get/sfg-planning.controller.js";
import { allocateSfg } from "./create/sfg-planning.controller.js";
import { cancelAllocation } from "./delete/sfg-planning.controller.js";

const SfgPlanningRouter = express.Router();

SfgPlanningRouter.get("/microbial-sfg/planning/check/:planId", authenticate, checkPlanMicrobes);
SfgPlanningRouter.post("/microbial-sfg/planning/allocate", authenticate, allocateSfg);
SfgPlanningRouter.get("/microbial-sfg/planning/allocations/:planId", authenticate, getAllocationsForPlan);
SfgPlanningRouter.delete("/microbial-sfg/planning/allocations/:id", authenticate, cancelAllocation);

export default SfgPlanningRouter;
