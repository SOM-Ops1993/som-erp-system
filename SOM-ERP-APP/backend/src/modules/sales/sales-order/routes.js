import { Router } from "express";

import {
  createSalesOrder,
  addCompany,
} from "./create/sales-order.controller.js";

import {
  deleteSalesOrder,
  deleteSalesOrderItem,
} from "./delete/sales-order.controller.js";

import {
  getSalesOrders,
  getSalesOrderById,
  getDashboardSummary,
  getSyncLogs,
  getCompanies,
} from "./get/sales-order.controller.js";

import {
  updateSalesOrder,
  updateSalesOrderItem,
  cancelOrder,
  dispatchOrder,
} from "./update/sales-order.controller.js";

// ____________------ Router -----------------------

const router = Router();

// Static paths must come before /:id

router.post("/", createSalesOrder);
router.post("/companies", addCompany);

router.get("/", getSalesOrders);
router.get("/summary/dashboard", getDashboardSummary);
router.get("/sync-log", getSyncLogs);
router.get("/companies", getCompanies);
router.get("/:id", getSalesOrderById);

router.put("/:id", updateSalesOrder);

router.patch("/item/:itemId", updateSalesOrderItem);
router.patch("/cancel/:id", cancelOrder);
router.patch("/dispatch/:id", dispatchOrder);

router.delete("/item/:itemId", deleteSalesOrderItem);
router.delete("/:id", deleteSalesOrder);

export default router;
