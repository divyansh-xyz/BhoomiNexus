import { Router } from "express";
import {
  getCompensationDashboard,
  getCompensationTasks,
  getCompensationRecordById,
  createCompensationRecord,
  updateCompensationRecord,
  markCompensationPaid,
  completeCompensationTask,
} from "./compensation.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

const router = Router();
router.use(authenticate);

router.get("/dashboard", getCompensationDashboard);
router.get("/tasks", getCompensationTasks);
router.get("/records/:recordId", getCompensationRecordById);
router.post("/records", authorize(["COMPENSATION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"]), createCompensationRecord);
router.patch("/records/:recordId", authorize(["COMPENSATION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"]), updateCompensationRecord);
router.post("/records/:recordId/mark-paid", authorize(["COMPENSATION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"]), markCompensationPaid);
router.post("/tasks/:taskId/complete", authorize(["COMPENSATION_OFFICER", "ADMIN"]), completeCompensationTask);

export default router;
