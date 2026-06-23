import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { listContainers, getContainer, createContainer, patchContainer, allocateCfu, createTransaction, confirmReceipt, listTransactions, getDecayReport } from "./erp-microbial/microbial.controller.js";
import { listMicrobes, getMicrobe, createMicrobe, updateMicrobe, deleteMicrobe, importMicrobes, migrateTables } from "./sfg/master/sfg-master.controller.js";
import { listSfgContainers, listAvailableSfgContainers, getNextContainerCode, getSfgContainerBatches, listSfgInward, getSfgInwardSummary, createSfgInward, updateSfgInward, importSfgInward } from "./sfg/inward/sfg-inward.controller.js";
import { checkPlanMicrobes, allocateSfg, getAllocationsForPlan, cancelAllocation } from "./sfg/planning/sfg-planning.controller.js";

const MicrobialRouter = express.Router();
const storeOrAbove = authorize(["store_person", "store_manager", "admin"]);
const authOrPlanner = authorize(["store_person", "store_manager", "admin", "planner", "planning_manager"]);

// ── ERP Microbial Containers ──────────────────────────────────────────────────
MicrobialRouter.get("/erp/microbial/containers", authenticate, authOrPlanner, listContainers);
MicrobialRouter.get("/erp/microbial/containers/:id", authenticate, authOrPlanner, getContainer);
MicrobialRouter.post("/erp/microbial/containers", authenticate, storeOrAbove, createContainer);
MicrobialRouter.patch("/erp/microbial/containers/:id", authenticate, storeOrAbove, patchContainer);
MicrobialRouter.post("/erp/microbial/allocate", authenticate, authOrPlanner, allocateCfu);
MicrobialRouter.get("/erp/microbial/transactions", authenticate, authOrPlanner, listTransactions);
MicrobialRouter.post("/erp/microbial/transactions", authenticate, storeOrAbove, createTransaction);
MicrobialRouter.patch("/erp/microbial/transactions/:id/confirm-receipt", authenticate, confirmReceipt);
MicrobialRouter.get("/erp/microbial/decay-report", authenticate, authOrPlanner, getDecayReport);

// ── Microbial SFG — Masters ───────────────────────────────────────────────────
MicrobialRouter.post("/microbial-sfg/masters/migrate", authenticate, migrateTables);
MicrobialRouter.post("/microbial-sfg/masters/microbes/import", authenticate, importMicrobes);
MicrobialRouter.get("/microbial-sfg/masters/microbes", authenticate, listMicrobes);
MicrobialRouter.get("/microbial-sfg/masters/microbes/:id", authenticate, getMicrobe);
MicrobialRouter.post("/microbial-sfg/masters/microbes", authenticate, createMicrobe);
MicrobialRouter.put("/microbial-sfg/masters/microbes/:id", authenticate, updateMicrobe);
MicrobialRouter.delete("/microbial-sfg/masters/microbes/:id", authenticate, deleteMicrobe);

// ── Microbial SFG — Inward & Containers ──────────────────────────────────────
MicrobialRouter.get("/microbial-sfg/inward/containers/available", authenticate, listAvailableSfgContainers);
MicrobialRouter.get("/microbial-sfg/inward/containers/next-code", authenticate, getNextContainerCode);
MicrobialRouter.get("/microbial-sfg/inward/containers/:id/batches", authenticate, getSfgContainerBatches);
MicrobialRouter.get("/microbial-sfg/inward/containers", authenticate, listSfgContainers);
MicrobialRouter.get("/microbial-sfg/inward/summary", authenticate, getSfgInwardSummary);
MicrobialRouter.post("/microbial-sfg/inward/import", authenticate, importSfgInward);
MicrobialRouter.put("/microbial-sfg/inward/:id", authenticate, updateSfgInward);
MicrobialRouter.get("/microbial-sfg/inward", authenticate, listSfgInward);
MicrobialRouter.post("/microbial-sfg/inward", authenticate, createSfgInward);

// ── Microbial SFG — Planning ──────────────────────────────────────────────────
MicrobialRouter.get("/microbial-sfg/planning/check/:planId", authenticate, checkPlanMicrobes);
MicrobialRouter.post("/microbial-sfg/planning/allocate", authenticate, allocateSfg);
MicrobialRouter.get("/microbial-sfg/planning/allocations/:planId", authenticate, getAllocationsForPlan);
MicrobialRouter.delete("/microbial-sfg/planning/allocations/:id", authenticate, cancelAllocation);

export default MicrobialRouter;
