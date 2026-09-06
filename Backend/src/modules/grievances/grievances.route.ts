import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getProjectGrievances, createGrievance, respondGrievance } from './grievances.controller';

const router = Router();

// Allow authenticated users (Requesting Authority, BOSS, Officer) to view & record grievances
router.get('/projects/:projectId/grievances', authenticate, getProjectGrievances);
router.post('/projects/:projectId/grievances', authenticate, createGrievance);
router.post('/grievances/:grievanceId/respond', authenticate, respondGrievance);

export default router;
