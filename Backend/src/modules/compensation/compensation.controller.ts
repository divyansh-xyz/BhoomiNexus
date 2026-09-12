import { Request, Response, NextFunction } from "express";
import * as compService from "./compensation.service";

export const getCompensationDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = (req.query.state as string) || req.user?.state;
    const district = (req.query.district as string) || req.user?.district;
    const projectId = req.query.projectId as string;

    const data = await compService.getCompensationDashboard({ state, district, projectId });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getCompensationTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const tasks = await compService.getCompensationTasks(userId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const getCompensationRecordById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordId = req.params.recordId as string;
    const record = await compService.getCompensationRecordById(recordId);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const createCompensationRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const record = await compService.createCompensationRecord(req.body, userId);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const updateCompensationRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordId = req.params.recordId as string;
    const userId = req.user!.id;
    const record = await compService.updateCompensationRecord(recordId, req.body, userId);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const markCompensationPaid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordId = req.params.recordId as string;
    const userId = req.user!.id;
    const record = await compService.markCompensationPaid(recordId, req.body, userId);
    res.json({ success: true, message: "Compensation marked as paid", data: record });
  } catch (error) {
    next(error);
  }
};

export const completeCompensationTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.taskId as string;
    const userId = req.user!.id;
    const result = await compService.completeCompensationTask(taskId, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
