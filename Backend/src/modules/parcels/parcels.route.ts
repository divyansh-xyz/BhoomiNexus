import { Router } from "express";
import { getParcelById, getParcelGeometry } from "./parcels.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Allow authenticated roles to resolve parcel passport data
router.use(authenticate);

// GET /api/v1/parcels/:parcelId
router.get("/:parcelId", getParcelById);

// GET /api/v1/parcels/:parcelId/geometry
router.get("/:parcelId/geometry", getParcelGeometry);

export default router;
