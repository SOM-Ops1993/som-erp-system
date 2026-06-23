import { Router } from "express";
import {
  getCustomerProfiles,
  getCpProfiles,
} from "./get/customer-profile.controller.js";
import { upsertCustomerProfile } from "./update/customer-profile.controller.js";
import {
  seedCustomerProfiles,
  upsertManyCpProfiles,
} from "./create/cp-profiles.controller.js";

const router = Router();

router.get("/", getCustomerProfiles);
router.get("/cp-profiles", getCpProfiles);

router.post("/upsert", upsertCustomerProfile);
router.post("/upsert-many", upsertManyCpProfiles);
router.post("/seed", seedCustomerProfiles);

export default router;
