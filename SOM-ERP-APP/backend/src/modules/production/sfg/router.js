import express from "express";
import { authenticate } from "../../../middleware/auth.js";
import { listSfg, getSfgSummary, getSfg } from "./get/sfg.controller.js";
import { updateSfg } from "./update/sfg.controller.js";

const SfgRouter = express.Router();

SfgRouter.get("/sfg/summary", authenticate, getSfgSummary);
SfgRouter.get("/sfg/:sfgId", authenticate, getSfg);
SfgRouter.get("/sfg", authenticate, listSfg);
SfgRouter.put("/sfg/:sfgId", authenticate, updateSfg);

export default SfgRouter;
