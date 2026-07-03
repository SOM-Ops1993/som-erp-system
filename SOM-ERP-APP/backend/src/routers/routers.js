import express from "express";
import multer from "multer";

import UserRouter from "../modules/user/routes.js";
import InventoryRouter from "../modules/inventory/routes.js";
import SalesRouter from "../modules/sales/routes.js";
import ProductionRouter from "../modules/production/routes.js";
import PlanningRouter from "../modules/planning/routes.js";
import TasksRouter from "../modules/production/tasks/tasks.router.js";
import MasterDataRouter from "../modules/master-data/routes.js";
import HRRouter from "../modules/hr/routes.js";
import MicrobialRouter from "../modules/microbial/routes.js";
import ExportRouter from "../modules/export/routes.js";

// Admin Panel Router
import AdminPanelRouter from "../modules/admin_panel/router.js";

// Import controller
import {
  previewImport,
  executeImport,
} from "../modules/inventory/import/create/import.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});
const adminOnly = authorize(["admin"]);

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
// Handles: /api/auth/* — POST /api/auth/login, GET /api/auth/me
router.use("/auth", UserRouter);

// ── Inventory ─────────────────────────────────────────────────────────────────

// Handles: /api/rm, /api/packs, /api/inward, /api/outward, /api/stock,
//          /api/ledger, /api/grn, /api/import, /api/bulk,
//          /api/gate, /api/inventory

router.use("/", InventoryRouter);
 

// ── Sales ─────────────────────────────────────────────────────────────────────
// Handles: /api/customer-profiles, /api/cp-profiles, /api/tracker,
//          /api/bom-sends, /api/sales, /api/sales-orders,
//          /api/notifications
router.use("/", SalesRouter);

// ── Production ────────────────────────────────────────────────────────────────
// Handles: /api/production, /api/indent, /api/sfg, /api/recipe,
//          /api/bom-issuance
router.use("/", ProductionRouter);

// ── Planning ──────────────────────────────────────────────────────────────────
// Handles: /api/plan-engine/*, /api/planning/*, /api/sales/planner-queue
router.use("/", PlanningRouter);

// ── Production Tasks (plant scheduling) ──────────────────────────────────────
// Handles: /api/production/tasks, /api/production/search/*
router.use("/", TasksRouter);

// ── Master Data ───────────────────────────────────────────────────────────────
// Handles: /api/rm, /api/products, /api/equipment, /api/masters/*
router.use("/", MasterDataRouter);

// ── HR ────────────────────────────────────────────────────────────────────────
// Handles: /api/employees/*
// router.use("/", HRRouter);

// ── Microbial ─────────────────────────────────────────────────────────────────
// Handles: /api/microbial-sfg/*, /api/microbial/*
// router.use("/", MicrobialRouter);

// ── Export ────────────────────────────────────────────────────────────────────
// Handles: /api/export/*
// router.use("/", ExportRouter);

// ── Import (Excel file upload → DB) ──────────────────────────────────────────
router.post(
  "/import/preview",
  authenticate,
  adminOnly,
  upload.single("file"),
  previewImport,
);

router.post(
  "/import/execute",
  authenticate,
  adminOnly,
  upload.single("file"),
  executeImport,
);

// ---- admin planel routes (not prefixed with /api) ───────────────────────────────────────────
router.use("/admin", AdminPanelRouter);

export default router;
