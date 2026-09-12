import { Router } from "express";
import {
  getTemplates, getTemplateById, initializeWorkflow, getProjectWorkflow,
  addStage, updateStage, removeStage, reorderWorkflow, activateWorkflow,
  // V2 Handlers
  getProjectWorkflowGraph, initializeWorkflowV2, createWorkflowNodeV2,
  updateWorkflowNodeV2, deleteWorkflowNodeV2, createWorkflowEdgeV2,
  deleteWorkflowEdgeV2, splitWorkflowNodeV2, moveCohortParcelsV2,
  getNodeParcelsV2, saveWorkflowDesignV2, getContextualTemplatesV2,
  previewTemplateV2, applyTemplateV2, validateWorkflowV2, activateWorkflowV2,
  getWorkflowExecutionV2
} from "./workflows.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

// Mounted at /api/v1/workflow-templates
export const templateRouter = Router();
templateRouter.get("/", getTemplates);
templateRouter.get("/contextual", getContextualTemplatesV2);
templateRouter.get("/:id", getTemplateById);

// Mounted at /api/v1/projects/:projectId/workflow
export const projectWorkflowRouter = Router({ mergeParams: true });
projectWorkflowRouter.use(authenticate);

// V2 Workflow Graph & Builder Endpoints
projectWorkflowRouter.get("/", getProjectWorkflowGraph);
projectWorkflowRouter.put("/", authorize(["BOSS", "ADMIN"]), saveWorkflowDesignV2);
projectWorkflowRouter.post("/initialize", authorize(["BOSS", "ADMIN"]), initializeWorkflowV2);

// V2 Nodes
projectWorkflowRouter.post("/nodes", authorize(["BOSS", "ADMIN"]), createWorkflowNodeV2);
projectWorkflowRouter.patch("/nodes/:nodeId", authorize(["BOSS", "ADMIN"]), updateWorkflowNodeV2);
projectWorkflowRouter.delete("/nodes/:nodeId", authorize(["BOSS", "ADMIN"]), deleteWorkflowNodeV2);
projectWorkflowRouter.post("/nodes/:nodeId/split", authorize(["BOSS", "ADMIN"]), splitWorkflowNodeV2);
projectWorkflowRouter.get("/nodes/:nodeId/parcels", getNodeParcelsV2);

// V2 Edges
projectWorkflowRouter.post("/edges", authorize(["BOSS", "ADMIN"]), createWorkflowEdgeV2);
projectWorkflowRouter.delete("/edges/:edgeId", authorize(["BOSS", "ADMIN"]), deleteWorkflowEdgeV2);

// V2 Cohorts
projectWorkflowRouter.post("/cohorts/move-parcels", authorize(["BOSS", "ADMIN"]), moveCohortParcelsV2);

// V2 Contextual Templates
projectWorkflowRouter.post("/nodes/:nodeId/templates/preview", authorize(["BOSS", "ADMIN"]), previewTemplateV2);
projectWorkflowRouter.post("/nodes/:nodeId/templates/apply", authorize(["BOSS", "ADMIN"]), applyTemplateV2);

// V2 Validation & Activation
projectWorkflowRouter.post("/validate", authorize(["BOSS", "ADMIN"]), validateWorkflowV2);
projectWorkflowRouter.post("/activate", authorize(["BOSS", "ADMIN"]), activateWorkflowV2);
projectWorkflowRouter.get("/execution", getWorkflowExecutionV2);

// V1 Backwards Compatibility Routes
projectWorkflowRouter.get("/stages", getProjectWorkflow);
projectWorkflowRouter.post("/stages", authorize(["BOSS", "ADMIN"]), addStage);
projectWorkflowRouter.put("/stages/:stageId", authorize(["BOSS", "ADMIN"]), updateStage);
projectWorkflowRouter.delete("/stages/:stageId", authorize(["BOSS", "ADMIN"]), removeStage);
projectWorkflowRouter.put("/order", authorize(["BOSS", "ADMIN"]), reorderWorkflow);

export default { templateRouter, projectWorkflowRouter };

