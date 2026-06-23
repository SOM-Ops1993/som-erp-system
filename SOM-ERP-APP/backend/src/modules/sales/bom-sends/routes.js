import { Router } from "express";
import { getBomSends, getBomSend } from "./get/bom-sends.controller.js";
import {
  createBomSend,
  issuePackToBomSend,
} from "./create/sales.controller.js";
import { updateBomSendStatus } from "./update/sales.controller.js";
import { deleteBomSend } from "./delete/sales.controller.js";

//---------------------  Router ---------------------

const router = Router();

router.get("/", getBomSends);
router.get("/:id", getBomSend);

router.post("/", createBomSend);
router.post("/:id/issue-pack", issuePackToBomSend);

router.patch("/:id/status", updateBomSendStatus);

router.delete("/:id", deleteBomSend);

export default router;
