import express from "express";
import { authenticate, authorize } from "../../../../middleware/auth.js";
import { listMicrobes, getMicrobe } from "./get/sfg-master.controller.js";
import { migrateTables, createMicrobe, importMicrobes } from "./create/sfg-master.controller.js";
import { updateMicrobe } from "./update/sfg-master.controller.js";
import { deleteMicrobe } from "./delete/sfg-master.controller.js";

const SfgMasterRouter = express.Router();
const adminOnly = authorize(["admin"]);

SfgMasterRouter.post("/microbial-sfg/masters/migrate", authenticate, adminOnly, migrateTables);
SfgMasterRouter.post("/microbial-sfg/masters/microbes/import", authenticate, adminOnly, importMicrobes);
SfgMasterRouter.get("/microbial-sfg/masters/microbes", authenticate, listMicrobes);
SfgMasterRouter.get("/microbial-sfg/masters/microbes/:id", authenticate, getMicrobe);
SfgMasterRouter.post("/microbial-sfg/masters/microbes", authenticate, adminOnly, createMicrobe);
SfgMasterRouter.put("/microbial-sfg/masters/microbes/:id", authenticate, adminOnly, updateMicrobe);
SfgMasterRouter.delete("/microbial-sfg/masters/microbes/:id", authenticate, adminOnly, deleteMicrobe);

export default SfgMasterRouter;
