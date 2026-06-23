import { Router } from "express";
import { listTrackerIndents, getTrackerDetail } from "./tracker.controller.js";

const router = Router();

router.get("/", listTrackerIndents);
router.get("/detail", getTrackerDetail);

export default router;
