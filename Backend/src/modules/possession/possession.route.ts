import { Router } from "express";
import {
  getPossessionDashboard,
  getPossessionTasks,
  getPossessionRecordById,
  linkPossessionEvidence,
  completePossessionRecord,
} from "./possession.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

const router = Router();
router.use(authenticate);

router.get("/dashboard", getPossessionDashboard);
router.get("/tasks", getPossessionTasks);
router.get("/records/:recordId", getPossessionRecordById);
router.post("/records/:recordId/evidence", authorize(["POSSESSION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"]), linkPossessionEvidence);
router.post("/records/:recordId/complete", authorize(["POSSESSION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"]), completePossessionRecord);

export default router;
