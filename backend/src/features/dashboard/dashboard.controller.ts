import type { Request, Response } from 'express';
import { asyncHandler } from '@/core/utils/asyncHandler';
import * as service from './dashboard.service';

export const get = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.get({ sub: req.user.sub, roles: req.user.roles });
  res.json({ data });
});
