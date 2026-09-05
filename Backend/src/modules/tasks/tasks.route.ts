import { Router } from "express";
import {
  getTasks, getTaskById, startTask, acceptTask, rejectTask, getTaskDocuments
} from "./tasks.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();
router.use(authenticate);

// GET /api/v1/tasks
router.get("/", getTasks);

// GET /api/v1/tasks/:id
router.get("/:id", getTaskById);

// POST /api/v1/tasks/:id/start
router.post("/:id/start", startTask);

// POST /api/v1/tasks/:id/accept
router.post("/:id/accept", acceptTask);

// POST /api/v1/tasks/:id/reject
router.post("/:id/reject", rejectTask);

// GET /api/v1/tasks/:taskId/documents
router.get("/:taskId/documents", getTaskDocuments);

export default router;
