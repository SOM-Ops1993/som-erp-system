import express from "express";
import multer from "multer";

import UserRouter from "../modules/user/routes.js";
import InventoryRouter from "../modules/inventory/routes.js";
import SalesRouter from "../modules/sales/routes.js";
import ProductionRouter from "../modules/production/routes.js";
import PlanningRouter from "../modules/planning/routes.js";
import MasterDataRouter from "../modules/master-data/routes.js";
import HRRouter from "../modules/hr/routes.js";
import MicrobialRouter from "../modules/microbial/routes.js";
import ExportRouter from "../modules/export/routes.js";

// Admin Panel Router
import AdminPanelRouter from "../modules/admin_panel/router.js";
import GateRouter from "../modules/inventory/gate/router.js";

// Import controller
import {
  previewImport,
  executeImport,
} from "../modules/inventory/import/import.controller.js";
import { authenticate, managerOrAbove } from "../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
// Handles: /api/auth/*
// router.use("/auth", UserRouter);

// ── Inventory ─────────────────────────────────────────────────────────────────
// Handles: /api/rm, /api/packs, /api/inward, /api/outward, /api/stock,
//          /api/ledger, /api/grn, /api/import, /api/bulk,
//          /api/erp/gate, /api/erp/inventory
router.use("/", InventoryRouter);

// ── Gate (Inward + Outward) ───────────────────────────────────────────────────
router.use("/erp/gate", GateRouter);

// ── Sales ─────────────────────────────────────────────────────────────────────
// Handles: /api/customer-profiles, /api/cp-profiles, /api/tracker,
//          /api/bom-sends, /api/erp/sales, /api/erp/sales-orders,
//          /api/erp/notifications
router.use("/", SalesRouter);

// ── Production ────────────────────────────────────────────────────────────────
// Handles: /api/production, /api/indent, /api/sfg, /api/recipe,
//          /api/erp/bom-issuance
router.use("/", ProductionRouter);

// ── Planning ──────────────────────────────────────────────────────────────────
// Handles: /api/plan-engine/*, /api/erp/planning/*, /api/sales/planner-queue
// router.use("/", PlanningRouter);

// ── Master Data ───────────────────────────────────────────────────────────────
// Handles: /api/rm, /api/products, /api/equipment, /api/erp/masters/*
router.use("/", MasterDataRouter);

// ── HR ────────────────────────────────────────────────────────────────────────
// Handles: /api/erp/employees/*
// router.use("/", HRRouter);

// ── Microbial ─────────────────────────────────────────────────────────────────
// Handles: /api/microbial-sfg/*, /api/erp/microbial/*
// router.use("/", MicrobialRouter);

// ── Export ────────────────────────────────────────────────────────────────────
// Handles: /api/erp/export/*
// router.use("/", ExportRouter);

// ── Import (Excel file upload → DB) ──────────────────────────────────────────
router.post(
  "/import/preview",
  authenticate,
  managerOrAbove,
  upload.single("file"),
  previewImport,
);
router.post(
  "/import/execute",
  authenticate,
  managerOrAbove,
  upload.single("file"),
  executeImport,
);

// ---- admin planel routes (not prefixed with /api) ───────────────────────────────────────────
router.use("/admin", AdminPanelRouter);

export default router;
