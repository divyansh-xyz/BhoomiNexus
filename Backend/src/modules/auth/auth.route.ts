import { Router } from "express";
import { login, getMe, logout, refresh } from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// POST /api/v1/auth/login
router.post("/login", login);

// POST /api/v1/auth/refresh
router.post("/refresh", refresh);

// GET /api/v1/auth/me
router.get("/me", authenticate, getMe);

// POST /api/v1/auth/logout
router.post("/logout", authenticate, logout);

export default router;
