import { Request, Response, NextFunction } from "express";
import { AuditService } from "./audit.service";

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, parcelId, action, entityType, limit } = req.query;
    const logs = await AuditService.getAuditLogs({
      projectId: projectId as string,
      parcelId: parcelId as string,
      action: action as string,
      entityType: entityType as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

export const verifyAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await AuditService.verifyAuditLog(id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
