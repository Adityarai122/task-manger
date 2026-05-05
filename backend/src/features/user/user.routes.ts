import { Router } from 'express';
import { authenticate } from '@/core/middleware/authenticate';
import { requirePermission } from '@/core/middleware/requirePermission';
import * as ctrl from './user.controller';

const router = Router();
router.use(authenticate);

// ── Self routes (any authenticated user) ─────────────
router.get('/me', requirePermission('self.read'), ctrl.getMe);
router.patch('/me', requirePermission('self.update'), ctrl.updateMe);

// ── Admin-only routes ────────────────────────────────
router.get('/', requirePermission('user.read'), ctrl.list);
router.post('/', requirePermission('user.create'), ctrl.invite);
router.get('/:id', requirePermission('user.read'), ctrl.getById);
router.patch('/:id', requirePermission('user.update'), ctrl.update);
router.patch('/:id/role', requirePermission('user.role.change'), ctrl.changeRole);
router.delete('/:id', requirePermission('user.delete'), ctrl.deactivate);

export default router;
