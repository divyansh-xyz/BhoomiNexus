import { Router } from "express";
import { getAuditLogs, verifyAuditLog } from "./audit.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);
router.get("/", getAuditLogs);
router.get("/:id/verify", verifyAuditLog);

export default router;
