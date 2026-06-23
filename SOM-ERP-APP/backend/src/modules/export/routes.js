import express from "express";
import { authenticate } from "../../middleware/auth.js";
import { exportSalesOrders, exportAtRiskOrders, exportDispatchSummary, exportSalesPerformance, exportMicrobialStock, exportCfuDecay, exportMicrobialTransactions, exportDemandStockGap, exportProductionSchedule, exportTimeMotion, exportEquipmentUtilisation, exportRmForecast, exportManagementPack, exportGateInwardLog } from "./export.controller.js";

const ExportRouter = express.Router();

ExportRouter.get("/erp/export/sales-orders", authenticate, exportSalesOrders);
ExportRouter.get("/erp/export/at-risk-orders", authenticate, exportAtRiskOrders);
ExportRouter.get("/erp/export/dispatch-summary", authenticate, exportDispatchSummary);
ExportRouter.get("/erp/export/sales-performance", authenticate, exportSalesPerformance);
ExportRouter.get("/erp/export/microbial-stock", authenticate, exportMicrobialStock);
ExportRouter.get("/erp/export/cfu-decay", authenticate, exportCfuDecay);
ExportRouter.get("/erp/export/microbial-transactions", authenticate, exportMicrobialTransactions);
ExportRouter.get("/erp/export/demand-stock-gap", authenticate, exportDemandStockGap);
ExportRouter.get("/erp/export/production-schedule", authenticate, exportProductionSchedule);
ExportRouter.get("/erp/export/time-motion", authenticate, exportTimeMotion);
ExportRouter.get("/erp/export/equipment-utilisation", authenticate, exportEquipmentUtilisation);
ExportRouter.get("/erp/export/rm-forecast", authenticate, exportRmForecast);
ExportRouter.get("/erp/export/management-pack", authenticate, exportManagementPack);
ExportRouter.get("/erp/export/gate-inward-log", authenticate, exportGateInwardLog);

export default ExportRouter;
