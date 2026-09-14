import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  getProjectGrievances,
  createGrievance,
  respondGrievance,
  closeGrievance,
  getAllGrievances,
  getGrievanceById,
} from './grievances.controller';

const router = Router();

// V2 API: Global grievance endpoints (Authority dashboard)
router.get('/grievances', authenticate, getAllGrievances);
router.get('/grievances/:grievanceId', authenticate, getGrievanceById);
router.post('/grievances/:grievanceId/respond', authenticate, respondGrievance);
router.post('/grievances/:grievanceId/close', authenticate, closeGrievance);

// V2 API: Project-scoped grievance endpoints
router.get('/projects/:projectId/grievances', authenticate, getProjectGrievances);
router.post('/projects/:projectId/grievances', authenticate, createGrievance);

export default router;
