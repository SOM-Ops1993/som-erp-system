import express from "express";
import ErpMicrobialRouter from "./erp-microbial/router.js";
import SfgMasterRouter from "./sfg/master/router.js";
import SfgInwardRouter from "./sfg/inward/router.js";
import SfgPlanningRouter from "./sfg/planning/router.js";

const MicrobialRouter = express.Router();
MicrobialRouter.use("/", ErpMicrobialRouter);
MicrobialRouter.use("/", SfgMasterRouter);
MicrobialRouter.use("/", SfgInwardRouter);
MicrobialRouter.use("/", SfgPlanningRouter);

export default MicrobialRouter;
