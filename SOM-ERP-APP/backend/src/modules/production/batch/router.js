import express from "express";
import { authenticate } from "../../../middleware/auth.js";
import { listBatches, getBatch } from "./get/batch.controller.js";
import { createBatch, addFormulationCycle } from "./create/batch.controller.js";
import { patchBatch, saveBiomass, saveTechnical, updateFormulationCycle, saveUnloading, saveSieving, savePacking, saveQc, saveInventory } from "./update/batch.controller.js";
import { deleteFormulationCycle } from "./delete/batch.controller.js";

const BatchRouter = express.Router();

BatchRouter.get("/production", authenticate, listBatches);
BatchRouter.post("/production", authenticate, createBatch);
BatchRouter.get("/production/:id", authenticate, getBatch);
BatchRouter.patch("/production/:id", authenticate, patchBatch);
BatchRouter.put("/production/:id/biomass", authenticate, saveBiomass);
BatchRouter.put("/production/:id/technical", authenticate, saveTechnical);
BatchRouter.post("/production/:id/formulation", authenticate, addFormulationCycle);
BatchRouter.put("/production/:id/formulation/:cycleId", authenticate, updateFormulationCycle);
BatchRouter.delete("/production/:id/formulation/:cycleId", authenticate, deleteFormulationCycle);
BatchRouter.put("/production/:id/unloading", authenticate, saveUnloading);
BatchRouter.put("/production/:id/sieving", authenticate, saveSieving);
BatchRouter.put("/production/:id/packing", authenticate, savePacking);
BatchRouter.put("/production/:id/qc", authenticate, saveQc);
BatchRouter.put("/production/:id/inventory", authenticate, saveInventory);

export default BatchRouter;
