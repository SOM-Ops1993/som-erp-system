import express from "express";
import { authenticate } from "../../../../middleware/auth.js";
import { listSfgContainers, listAvailableSfgContainers, getNextContainerCode, getSfgContainerBatches, listSfgInward, getSfgInwardSummary } from "./get/sfg-inward.controller.js";
import { createSfgInward, importSfgInward } from "./create/sfg-inward.controller.js";
import { updateSfgInward } from "./update/sfg-inward.controller.js";

const SfgInwardRouter = express.Router();

SfgInwardRouter.get("/microbial-sfg/inward/containers/available", authenticate, listAvailableSfgContainers);
SfgInwardRouter.get("/microbial-sfg/inward/containers/next-code", authenticate, getNextContainerCode);
SfgInwardRouter.get("/microbial-sfg/inward/containers/:id/batches", authenticate, getSfgContainerBatches);
SfgInwardRouter.get("/microbial-sfg/inward/containers", authenticate, listSfgContainers);
SfgInwardRouter.get("/microbial-sfg/inward/summary", authenticate, getSfgInwardSummary);
SfgInwardRouter.post("/microbial-sfg/inward/import", authenticate, importSfgInward);
SfgInwardRouter.put("/microbial-sfg/inward/:id", authenticate, updateSfgInward);
SfgInwardRouter.get("/microbial-sfg/inward", authenticate, listSfgInward);
SfgInwardRouter.post("/microbial-sfg/inward", authenticate, createSfgInward);

export default SfgInwardRouter;
