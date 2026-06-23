import express from "express";
import multer from "multer";
import { authenticate, authorize } from "../../middleware/auth.js";
import { listStock, listContainers, getItemStock, getRmHistory } from "./stock/stock.controller.js";
import { getDashboardStats } from "./stock/dashboard.controller.js";
import { listLedger, getLedgerByItem, getLedgerEntry } from "./ledger/ledger.controller.js";
import { listGrn, getGrnDetail } from "./grn/grn.controller.js";
import { listRm, getRm, createRm, updateRm, deleteRm, listWarehouses } from "./row-material-master/rm-master.controller.js";
import { createSession, getSession, scanPack, removeScan, submitSession, listActiveSessions, listInward } from "./store/inward/inward.controller.js";
import { bomScan, bomManual, getAvailablePacks, packReduction, stockAdjustment, bagLossAdjustment, listOutward, warehouseTransfer, directIssue, bomDirectIssue } from "./store/outward/outward.controller.js";
import { listContainers as listContainersCtrl, getContainer, createContainer, fillContainer, issueFromContainer, getContainerLabel } from "./store/containers/containers.controller.js";
import { listLocations, getLocation, createLocation, deleteLocation, getLocationLabel, bulkInward, bulkOutward, getBulkStockSummary } from "./bulk-location/bulk-location.controller.js";
import { previewImport, executeImport } from "./import/import.controller.js";
import { getPendingInwardGroups, getNextLotNumber, listPacks, getPackById, getPackLabel, getBatchLabels, generatePacks } from "./store/inward/get/inward.controller.js";
import GateRouter from "./gate/router.js";
import adjustmentsRouter from "./adjustments/routes.js";

const InventoryRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const storeOrAbove = authorize(["store_person", "store_manager", "admin"]);
const managerOrAbove = authorize(["store_manager", "admin"]);

// ── RM Master ─────────────────────────────────────────────────────────────────
InventoryRouter.get("/rm", authenticate, listRm);
InventoryRouter.get("/rm/warehouses", authenticate, listWarehouses);
InventoryRouter.get("/rm/:itemCode", authenticate, getRm);
InventoryRouter.post("/rm", authenticate, managerOrAbove, createRm);
InventoryRouter.put("/rm/:itemCode", authenticate, managerOrAbove, updateRm);
InventoryRouter.delete("/rm/:itemCode", authenticate, managerOrAbove, deleteRm);

// ── Stock ─────────────────────────────────────────────────────────────────────
InventoryRouter.get("/stock/dashboard", authenticate, getDashboardStats);
InventoryRouter.get("/stock", authenticate, listStock);
InventoryRouter.get("/stock/containers", authenticate, listContainers);
InventoryRouter.get("/stock/rm/:itemCode/history", authenticate, getRmHistory);
InventoryRouter.get("/stock/:itemCode", authenticate, getItemStock);

// ── Ledger ────────────────────────────────────────────────────────────────────
InventoryRouter.get("/ledger", authenticate, listLedger);
InventoryRouter.get("/ledger/item/:itemCode", authenticate, getLedgerByItem);
InventoryRouter.get("/ledger/:id", authenticate, getLedgerEntry);

// ── GRN ───────────────────────────────────────────────────────────────────────
InventoryRouter.get("/grn", authenticate, listGrn);
InventoryRouter.get("/grn/:id", authenticate, getGrnDetail);

// ── Print Master / Pack generation ────────────────────────────────────────────
InventoryRouter.get("/packs/pending-inward", authenticate, getPendingInwardGroups);
InventoryRouter.get("/packs/next-lot/:itemCode", authenticate, getNextLotNumber);
InventoryRouter.get("/packs/label/:packId", getPackLabel);
InventoryRouter.get("/packs/labels/lot/:itemCode/:lotNo", getBatchLabels);
InventoryRouter.get("/packs/:packId", authenticate, getPackById);
InventoryRouter.get("/packs", authenticate, listPacks);
InventoryRouter.post("/packs/generate", authenticate, storeOrAbove, generatePacks);

// ── Inward (session-based) ────────────────────────────────────────────────────
InventoryRouter.get("/inward", authenticate, listInward);
InventoryRouter.get("/inward/sessions", authenticate, listActiveSessions);
InventoryRouter.post("/inward/sessions", authenticate, storeOrAbove, createSession);
InventoryRouter.get("/inward/sessions/:sessionId", authenticate, getSession);
InventoryRouter.post("/inward/sessions/:sessionId/scan", authenticate, storeOrAbove, scanPack);
InventoryRouter.delete("/inward/sessions/:sessionId/scan/:packId", authenticate, storeOrAbove, removeScan);
InventoryRouter.post("/inward/sessions/:sessionId/submit", authenticate, storeOrAbove, submitSession);

// ── Outward ───────────────────────────────────────────────────────────────────
InventoryRouter.get("/outward", authenticate, listOutward);
InventoryRouter.get("/outward/available/:rmCode", authenticate, getAvailablePacks);
InventoryRouter.post("/outward/bom-scan", authenticate, storeOrAbove, bomScan);
InventoryRouter.post("/outward/bom-manual", authenticate, storeOrAbove, bomManual);
InventoryRouter.post("/outward/pack-reduction", authenticate, storeOrAbove, packReduction);
InventoryRouter.post("/outward/stock-adjustment", authenticate, managerOrAbove, stockAdjustment);
InventoryRouter.post("/outward/loss-adjustment", authenticate, storeOrAbove, bagLossAdjustment);
InventoryRouter.post("/outward/warehouse-transfer", authenticate, storeOrAbove, warehouseTransfer);
InventoryRouter.post("/outward/direct-issue", authenticate, storeOrAbove, directIssue);
InventoryRouter.post("/outward/bom-direct", authenticate, storeOrAbove, bomDirectIssue);

// ── Containers ────────────────────────────────────────────────────────────────
InventoryRouter.get("/containers", authenticate, listContainersCtrl);
InventoryRouter.post("/containers", authenticate, storeOrAbove, createContainer);
InventoryRouter.get("/containers/:containerId/label", getContainerLabel);
InventoryRouter.get("/containers/:containerId", authenticate, getContainer);
InventoryRouter.post("/containers/:containerId/fill", authenticate, storeOrAbove, fillContainer);
InventoryRouter.post("/containers/:containerId/issue", authenticate, storeOrAbove, issueFromContainer);

// ── Bulk Location ─────────────────────────────────────────────────────────────
InventoryRouter.get("/bulk/summary", authenticate, getBulkStockSummary);
InventoryRouter.get("/bulk/locations", authenticate, listLocations);
InventoryRouter.post("/bulk/locations", authenticate, managerOrAbove, createLocation);
InventoryRouter.get("/bulk/locations/:locationId/label", getLocationLabel);
InventoryRouter.get("/bulk/locations/:locationId", authenticate, getLocation);
InventoryRouter.delete("/bulk/locations/:locationId", authenticate, managerOrAbove, deleteLocation);
InventoryRouter.post("/bulk/inward", authenticate, storeOrAbove, bulkInward);
InventoryRouter.post("/bulk/outward", authenticate, storeOrAbove, bulkOutward);

// ── Import ────────────────────────────────────────────────────────────────────
InventoryRouter.post("/import/preview", authenticate, managerOrAbove, upload.single("file"), previewImport);
InventoryRouter.post("/import/execute", authenticate, managerOrAbove, upload.single("file"), executeImport);

// ── Gate (Inward + Outward) ───────────────────────────────────────────────────
InventoryRouter.use("/erp/gate", GateRouter);

// ── Adjustments sub-router ────────────────────────────────────────────────────
InventoryRouter.use("/erp/inventory", adjustmentsRouter);

export default InventoryRouter;
