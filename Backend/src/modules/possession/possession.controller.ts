import { Request, Response, NextFunction } from "express";
import * as possService from "./possession.service";

export const getPossessionDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = (req.query.state as string) || req.user?.state;
    const district = (req.query.district as string) || req.user?.district;
    const projectId = req.query.projectId as string;

    const data = await possService.getPossessionDashboard({ state, district, projectId });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getPossessionTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const tasks = await possService.getPossessionTasks(userId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const getPossessionRecordById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordId = req.params.recordId as string;
    const record = await possService.getPossessionRecordById(recordId);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const linkPossessionEvidence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordId = req.params.recordId as string;
    const userId = req.user!.id;
    const evidence = await possService.linkPossessionEvidence(recordId, req.body, userId);
    res.status(201).json({ success: true, data: evidence });
  } catch (error) {
    next(error);
  }
};

export const completePossessionRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordId = req.params.recordId as string;
    const userId = req.user!.id;
    const record = await possService.completePossessionRecord(recordId, userId);
    res.json({ success: true, message: "Physical possession completed successfully", data: record });
  } catch (error) {
    next(error);
  }
};
