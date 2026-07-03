import express from "express";
import { authenticate } from "../../middleware/auth.js";
import { exportSalesOrders, exportAtRiskOrders, exportDispatchSummary, exportSalesPerformance, exportMicrobialStock, exportCfuDecay, exportMicrobialTransactions, exportDemandStockGap, exportProductionSchedule, exportTimeMotion, exportEquipmentUtilisation, exportRmForecast, exportManagementPack, exportGateInwardLog } from "./get/export.controller.js";

const ExportRouter = express.Router();

ExportRouter.get("/export/sales-orders", authenticate, exportSalesOrders);
ExportRouter.get("/export/at-risk-orders", authenticate, exportAtRiskOrders);
ExportRouter.get("/export/dispatch-summary", authenticate, exportDispatchSummary);
ExportRouter.get("/export/sales-performance", authenticate, exportSalesPerformance);
ExportRouter.get("/export/microbial-stock", authenticate, exportMicrobialStock);
ExportRouter.get("/export/cfu-decay", authenticate, exportCfuDecay);
ExportRouter.get("/export/microbial-transactions", authenticate, exportMicrobialTransactions);
ExportRouter.get("/export/demand-stock-gap", authenticate, exportDemandStockGap);
ExportRouter.get("/export/production-schedule", authenticate, exportProductionSchedule);
ExportRouter.get("/export/time-motion", authenticate, exportTimeMotion);
ExportRouter.get("/export/equipment-utilisation", authenticate, exportEquipmentUtilisation);
ExportRouter.get("/export/rm-forecast", authenticate, exportRmForecast);
ExportRouter.get("/export/management-pack", authenticate, exportManagementPack);
ExportRouter.get("/export/gate-inward-log", authenticate, exportGateInwardLog);

export default ExportRouter;
