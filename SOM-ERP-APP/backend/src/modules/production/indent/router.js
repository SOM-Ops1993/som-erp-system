import express from "express";
import { authenticate } from "../../../middleware/auth.js";
import { stockCheck, getNextBatchNo, getSfgAvailable, listProducts, getPurchaseSummary, getIndent, listIndents } from "./get/indent.controller.js";
import { createIndent, markPoSent } from "./create/indent.controller.js";

const IndentRouter = express.Router();

IndentRouter.get("/indent/stock-check", authenticate, stockCheck);
IndentRouter.get("/indent/next-batch-no", authenticate, getNextBatchNo);
IndentRouter.get("/indent/sfg-available", authenticate, getSfgAvailable);
IndentRouter.get("/indent/products/list", authenticate, listProducts);
IndentRouter.get("/indent/purchase-summary", authenticate, getPurchaseSummary);
IndentRouter.post("/indent/mark-po-sent", authenticate, markPoSent);
IndentRouter.get("/indent/:indentId", authenticate, getIndent);
IndentRouter.get("/indent", authenticate, listIndents);
IndentRouter.post("/indent", authenticate, createIndent);

export default IndentRouter;
