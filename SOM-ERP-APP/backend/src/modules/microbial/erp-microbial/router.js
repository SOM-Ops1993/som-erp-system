import express from "express";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { listContainers, getContainer, listTransactions, getDecayReport } from "./get/microbial.controller.js";
import { createContainer, allocateCfu, createTransaction } from "./create/microbial.controller.js";
import { patchContainer, confirmReceipt } from "./update/microbial.controller.js";

const ErpMicrobialRouter = express.Router();
const storeOrAbove = authorize(["production"]);
const authOrPlanner = authorize(["production"]);

ErpMicrobialRouter.get("/microbial/containers", authenticate, authOrPlanner, listContainers);
ErpMicrobialRouter.get("/microbial/containers/:id", authenticate, authOrPlanner, getContainer);
ErpMicrobialRouter.post("/microbial/containers", authenticate, storeOrAbove, createContainer);
ErpMicrobialRouter.patch("/microbial/containers/:id", authenticate, storeOrAbove, patchContainer);
ErpMicrobialRouter.post("/microbial/allocate", authenticate, authOrPlanner, allocateCfu);
ErpMicrobialRouter.get("/microbial/transactions", authenticate, authOrPlanner, listTransactions);
ErpMicrobialRouter.post("/microbial/transactions", authenticate, storeOrAbove, createTransaction);
ErpMicrobialRouter.patch("/microbial/transactions/:id/confirm-receipt", authenticate, confirmReceipt);
ErpMicrobialRouter.get("/microbial/decay-report", authenticate, authOrPlanner, getDecayReport);

export default ErpMicrobialRouter;
