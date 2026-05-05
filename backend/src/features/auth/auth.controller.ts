import type { Request, Response } from 'express';
import { asyncHandler } from '@/core/utils/asyncHandler';
import { BadRequestError } from '@/core/errors/AppError';
import * as service from './auth.service';
import { loginSchema, refreshSchema } from './auth.schema';

const ctxFromRequest = (req: Request) => ({
  userAgent: req.headers['user-agent'],
  ip: req.ip,
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const dto = loginSchema.parse(req.body);
  const result = await service.login(dto, ctxFromRequest(req));
  res.json({ data: result });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const dto = refreshSchema.parse(req.body);
  const result = await service.refresh(dto.refreshToken, ctxFromRequest(req));
  res.json({ data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = (req.body?.refreshToken ?? '').toString();
  if (!refreshToken) throw new BadRequestError('refreshToken is required');
  await service.logout(refreshToken);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: req.user });
});
