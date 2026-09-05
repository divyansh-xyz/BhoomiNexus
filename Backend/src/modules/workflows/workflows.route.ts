import { Router } from "express";
import {
  getTemplates, getTemplateById, initializeWorkflow, getProjectWorkflow,
  addStage, updateStage, removeStage, reorderWorkflow, activateWorkflow
} from "./workflows.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

// Mounted at /api/v1/workflow-templates
export const templateRouter = Router();
templateRouter.get("/", getTemplates);
templateRouter.get("/:id", getTemplateById);

// Mounted at /api/v1/projects/:projectId/workflow
export const projectWorkflowRouter = Router({ mergeParams: true });
projectWorkflowRouter.use(authenticate);

projectWorkflowRouter.post("/initialize", authorize(["BOSS", "ADMIN"]), initializeWorkflow);
projectWorkflowRouter.get("/", getProjectWorkflow);
projectWorkflowRouter.post("/stages", authorize(["BOSS", "ADMIN"]), addStage);
projectWorkflowRouter.put("/stages/:stageId", authorize(["BOSS", "ADMIN"]), updateStage);
projectWorkflowRouter.delete("/stages/:stageId", authorize(["BOSS", "ADMIN"]), removeStage);
projectWorkflowRouter.put("/order", authorize(["BOSS", "ADMIN"]), reorderWorkflow);
projectWorkflowRouter.post("/activate", authorize(["BOSS", "ADMIN"]), activateWorkflow);

export default { templateRouter, projectWorkflowRouter };
