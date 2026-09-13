import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import {
  getNationalDashboard,
  getStateDashboard,
  getDistrictDashboard,
} from "./dashboards.controller";

const router = Router();

router.get(
  "/national",
  authenticate,
  authorize(["NATIONAL_AUTHORITY", "ADMIN"]),
  getNationalDashboard
);

router.get(
  "/state/:stateId",
  authenticate,
  authorize(["STATE_AUTHORITY", "NATIONAL_AUTHORITY", "ADMIN"]),
  getStateDashboard
);

router.get(
  "/district/:districtId",
  authenticate,
  authorize(["DISTRICT_AUTHORITY", "STATE_AUTHORITY", "NATIONAL_AUTHORITY", "ADMIN"]),
  getDistrictDashboard
);

export default router;
