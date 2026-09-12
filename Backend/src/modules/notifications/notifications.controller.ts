import { Request, Response, NextFunction } from "express";
import { NotificationService } from "./notifications.service";
import { ApiError } from "../../utils/apiError";

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await NotificationService.getNotifications(user.id, user.role, {
      unreadOnly,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const updated = await NotificationService.markAsRead(id, user.id, user.role);
    if (!updated) {
      return next(new ApiError(404, "Notification not found or access denied"));
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const count = await NotificationService.markAllAsRead(user.id, user.role);

    res.json({
      success: true,
      message: `Marked ${count} notifications as read`,
      count,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const deleted = await NotificationService.deleteNotification(id, user.id, user.role);
    if (!deleted) {
      return next(new ApiError(404, "Notification not found or access denied"));
    }

    res.json({
      success: true,
      message: "Notification dismissed",
    });
  } catch (error) {
    next(error);
  }
};
