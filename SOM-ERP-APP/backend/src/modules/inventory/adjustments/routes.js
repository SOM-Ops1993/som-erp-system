import express from "express";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { createStockAdjustment, approveStockAdjustment, rejectStockAdjustment, listStockAdjustments } from "./stock-adjustments/stock-adjustments-controller.js";
import { createWarehouseTransfer, receiveWarehouseTransfer, listWarehouseTransfers } from "./warehouse-transfers/warehouse-transfers-controller.js";
import { createDecanting, listDecanting } from "./decanting/decanting.controller.js";
import { checkFifo, createFifoOverride } from "./fifo/fifo.controller.js";
import { getStockSummary } from "./stock-summary/stock-summary.controller.js";

const router = express.Router();
const storeOrAbove = authorize(["store"]);
const managerOrAbove = authorize(["store"]);

// Stock adjustments
router.post("/adjustments", authenticate, storeOrAbove, createStockAdjustment);
router.patch("/adjustments/:id/approve", authenticate, managerOrAbove, approveStockAdjustment);
router.patch("/adjustments/:id/reject", authenticate, managerOrAbove, rejectStockAdjustment);
router.get("/adjustments", authenticate, storeOrAbove, listStockAdjustments);

// Warehouse transfers
router.post("/transfers", authenticate, storeOrAbove, createWarehouseTransfer);
router.patch("/transfers/:id/receive", authenticate, storeOrAbove, receiveWarehouseTransfer);
router.get("/transfers", authenticate, storeOrAbove, listWarehouseTransfers);

// Decanting
router.post("/decanting", authenticate, storeOrAbove, createDecanting);
router.get("/decanting", authenticate, storeOrAbove, listDecanting);

// FIFO
router.post("/fifo-check", authenticate, checkFifo);
router.post("/fifo-override", authenticate, managerOrAbove, createFifoOverride);

// Stock overview
router.get("/stock-summary", authenticate, getStockSummary);

export default router;
