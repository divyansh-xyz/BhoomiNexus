import { Router } from "express";
import { getNationalOverview, getStatesList, getStateMetrics, getStateProjects } from "./public.controller";

const router = Router();

// GET /api/v1/public/overview
router.get("/overview", getNationalOverview);

// GET /api/v1/public/states
router.get("/states", getStatesList);

// GET /api/v1/public/states/:stateId
router.get("/states/:stateId", getStateMetrics);

// GET /api/v1/public/states/:stateId/projects
router.get("/states/:stateId/projects", getStateProjects);

export default router;
