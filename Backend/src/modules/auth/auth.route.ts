import { Router } from "express";
import { z } from "zod";
import { login, getMe } from "./auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, getMe);

export default router;
