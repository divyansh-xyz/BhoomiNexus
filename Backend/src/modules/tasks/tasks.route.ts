import { Router } from "express";
import {
  getTasks, getTaskById, startTask, acceptTask, rejectTask, getTaskDocuments
} from "./tasks.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

const router = Router();
router.use(authenticate);

// Operational officer roles that can execute tasks
const OPERATIONAL_OFFICER_ROLES = [
  "PROCESSING_OFFICER",
  "COMPENSATION_OFFICER",
  "POSSESSION_OFFICER",
  "ADMIN",
];

// GET /api/v1/tasks
router.get("/", getTasks);

// GET /api/v1/tasks/:id
router.get("/:id", getTaskById);

// POST /api/v1/tasks/:id/start
router.post("/:id/start", authorize(OPERATIONAL_OFFICER_ROLES), startTask);

// POST /api/v1/tasks/:id/accept
router.post("/:id/accept", authorize(OPERATIONAL_OFFICER_ROLES), acceptTask);

// POST /api/v1/tasks/:id/reject
router.post("/:id/reject", authorize(OPERATIONAL_OFFICER_ROLES), rejectTask);

// GET /api/v1/tasks/:taskId/documents
router.get("/:taskId/documents", getTaskDocuments);

export default router;
