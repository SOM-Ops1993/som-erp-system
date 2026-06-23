import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { listBatches, createBatch, getBatch, patchBatch, saveBiomass, saveTechnical, addFormulationCycle, updateFormulationCycle, deleteFormulationCycle, saveUnloading, saveSieving, savePacking, saveQc, saveInventory } from "./batch/production.controller.js";
import { stockCheck, getNextBatchNo, getSfgAvailable, createIndent, listIndents, listProducts, getPurchaseSummary, markPoSent, getIndent } from "./indent/indent.controller.js";
import { listSfg, getSfgSummary, getSfg, updateSfg } from "./sfg/sfg.controller.js";
import { listRecipe, listRecipeProducts, bulkSaveRecipe, deleteRecipeRow, deleteProductRecipe, checkRmMapping, fixRmMapping } from "./recipe/recipe.controller.js";
import { listPendingJobs, getJob, issueItem, scrapBatch, reprocessBatch, listHistory } from "./bom-issuance/bom-issuance.controller.js";

const ProductionRouter = express.Router();
const managerOrAbove = authorize(["store_manager", "admin"]);
const storeOrAbove = authorize(["store_person", "store_manager", "admin"]);

// ── Production Batches ─────────────────────────────────────────────────────────
ProductionRouter.get("/production", authenticate, listBatches);
ProductionRouter.post("/production", authenticate, createBatch);
ProductionRouter.get("/production/:id", authenticate, getBatch);
ProductionRouter.patch("/production/:id", authenticate, patchBatch);
ProductionRouter.put("/production/:id/biomass", authenticate, saveBiomass);
ProductionRouter.put("/production/:id/technical", authenticate, saveTechnical);
ProductionRouter.post("/production/:id/formulation", authenticate, addFormulationCycle);
ProductionRouter.put("/production/:id/formulation/:cycleId", authenticate, updateFormulationCycle);
ProductionRouter.delete("/production/:id/formulation/:cycleId", authenticate, deleteFormulationCycle);
ProductionRouter.put("/production/:id/unloading", authenticate, saveUnloading);
ProductionRouter.put("/production/:id/sieving", authenticate, saveSieving);
ProductionRouter.put("/production/:id/packing", authenticate, savePacking);
ProductionRouter.put("/production/:id/qc", authenticate, saveQc);
ProductionRouter.put("/production/:id/inventory", authenticate, saveInventory);

// ── Indent ─────────────────────────────────────────────────────────────────────
ProductionRouter.get("/indent/stock-check", authenticate, stockCheck);
ProductionRouter.get("/indent/next-batch-no", authenticate, getNextBatchNo);
ProductionRouter.get("/indent/sfg-available", authenticate, getSfgAvailable);
ProductionRouter.get("/indent/products/list", authenticate, listProducts);
ProductionRouter.get("/indent/purchase-summary", authenticate, getPurchaseSummary);
ProductionRouter.post("/indent/mark-po-sent", authenticate, markPoSent);
ProductionRouter.get("/indent/:indentId", authenticate, getIndent);
ProductionRouter.get("/indent", authenticate, listIndents);
ProductionRouter.post("/indent", authenticate, createIndent);

// ── SFG ───────────────────────────────────────────────────────────────────────
ProductionRouter.get("/sfg/summary", authenticate, getSfgSummary);
ProductionRouter.get("/sfg/:sfgId", authenticate, getSfg);
ProductionRouter.get("/sfg", authenticate, listSfg);
ProductionRouter.put("/sfg/:sfgId", authenticate, updateSfg);

// ── Recipe ────────────────────────────────────────────────────────────────────
ProductionRouter.get("/recipe/products", authenticate, listRecipeProducts);
ProductionRouter.get("/recipe/check-rm-mapping", authenticate, checkRmMapping);
ProductionRouter.post("/recipe/fix-rm-mapping", authenticate, managerOrAbove, fixRmMapping);
ProductionRouter.post("/recipe/bulk-save", authenticate, bulkSaveRecipe);
ProductionRouter.delete("/recipe/product/:productCode", authenticate, managerOrAbove, deleteProductRecipe);
ProductionRouter.delete("/recipe/:id", authenticate, managerOrAbove, deleteRecipeRow);
ProductionRouter.get("/recipe", authenticate, listRecipe);

// ── BOM Issuance ──────────────────────────────────────────────────────────────
ProductionRouter.get("/erp/bom-issuance/pending-jobs", authenticate, storeOrAbove, listPendingJobs);
ProductionRouter.get("/erp/bom-issuance/history", authenticate, storeOrAbove, listHistory);
ProductionRouter.get("/erp/bom-issuance/job/:jobId", authenticate, storeOrAbove, getJob);
ProductionRouter.post("/erp/bom-issuance/issue", authenticate, storeOrAbove, issueItem);
ProductionRouter.post("/erp/bom-issuance/jobs/:id/scrap", authenticate, storeOrAbove, scrapBatch);
ProductionRouter.post("/erp/bom-issuance/jobs/:id/reprocess", authenticate, managerOrAbove, reprocessBatch);

export default ProductionRouter;
