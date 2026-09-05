import { Router } from "express";
import { fetchLandRecords, getLandRecords, confirmParcels } from "./boss.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(authorize(["BOSS", "ADMIN"]));

// POST /api/v1/boss/projects/:projectId/land-records/fetch
router.post("/projects/:projectId/land-records/fetch", fetchLandRecords);

// GET /api/v1/boss/projects/:projectId/land-records
router.get("/projects/:projectId/land-records", getLandRecords);

// POST /api/v1/boss/projects/:projectId/parcels/confirm
router.post("/projects/:projectId/parcels/confirm", confirmParcels);

export default router;
