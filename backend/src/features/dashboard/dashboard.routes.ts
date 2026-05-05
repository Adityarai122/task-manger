import { Router } from 'express';
import { authenticate } from '@/core/middleware/authenticate';
import * as ctrl from './dashboard.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.get);

export default router;
