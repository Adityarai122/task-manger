import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '@/core/middleware/authenticate';
import * as ctrl from './auth.controller';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many auth attempts. Try again later.' } },
});

router.post('/login', authLimiter, ctrl.login);
router.post('/refresh', authLimiter, ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

export default router;
