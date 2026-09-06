import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "./notifications.controller";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.post("/mark-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);

export default router;
