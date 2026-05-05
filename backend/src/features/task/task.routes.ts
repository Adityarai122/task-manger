import { Router } from 'express';
import { authenticate } from '@/core/middleware/authenticate';
import { requireAnyPermission, requirePermission } from '@/core/middleware/requirePermission';
import * as ctrl from './task.controller';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('task.read'), ctrl.list);
// Either global task.create (admin) or task.create.member (project member).
// Service layer enforces project membership + member-only assignee for non-admins.
router.post('/', requireAnyPermission(['task.create', 'task.create.member']), ctrl.create);
router.get('/:id', requirePermission('task.read'), ctrl.getById);
router.patch('/:id', requirePermission('task.update'), ctrl.update);
router.patch(
  '/:id/own',
  requireAnyPermission(['task.update', 'task.update.own']),
  ctrl.updateOwn,
);
router.delete('/:id', requirePermission('task.delete'), ctrl.remove);

export default router;
