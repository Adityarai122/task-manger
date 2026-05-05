import { Router } from 'express';
import { authenticate } from '@/core/middleware/authenticate';
import { requirePermission } from '@/core/middleware/requirePermission';
import * as ctrl from './project.controller';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('project.read'), ctrl.list);
router.post('/', requirePermission('project.create'), ctrl.create);
router.get('/:id', requirePermission('project.read'), ctrl.getById);
router.patch('/:id', requirePermission('project.update'), ctrl.update);
router.delete('/:id', requirePermission('project.delete'), ctrl.remove);
router.post('/:id/members', requirePermission('project.member.manage'), ctrl.addMember);
router.delete('/:id/members/:userId', requirePermission('project.member.manage'), ctrl.removeMember);

export default router;
