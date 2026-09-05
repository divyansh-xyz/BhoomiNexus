import { Router } from "express";
import { getUsers, getUserById } from "./users.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Require authentication for all user endpoints
router.use(authenticate);

// GET /api/v1/users
router.get("/", getUsers);

// GET /api/v1/users/:id
router.get("/:id", getUserById);

export default router;
