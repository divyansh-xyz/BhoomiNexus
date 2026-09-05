import { Router } from "express";
import {
  getProjects, createProject, getProjectById, updateProject,
  updateProjectGeometry, submitProject, getProjectSummary, getProjectActions
} from "./projects.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

const router = Router();

// Secure all project routes
router.use(authenticate);

// GET /api/v1/projects
router.get("/", getProjects);

// POST /api/v1/projects
router.post("/", authorize(["REQUESTING_AUTHORITY"]), createProject);

// GET /api/v1/projects/:id
router.get("/:id", getProjectById);

// PATCH /api/v1/projects/:id
router.patch("/:id", authorize(["REQUESTING_AUTHORITY", "BOSS", "ADMIN"]), updateProject);

// POST /api/v1/projects/:id/geometry
router.post("/:id/geometry", authorize(["REQUESTING_AUTHORITY"]), updateProjectGeometry);

// POST /api/v1/projects/:id/submit
router.post("/:id/submit", authorize(["REQUESTING_AUTHORITY"]), submitProject);

// GET /api/v1/projects/:id/summary
router.get("/:id/summary", getProjectSummary);

// GET /api/v1/projects/:id/actions
router.get("/:id/actions", getProjectActions);

export default router;
