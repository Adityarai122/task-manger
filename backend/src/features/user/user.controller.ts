import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/core/utils/asyncHandler';
import * as service from './user.service';
import {
  changeRoleSchema,
  inviteUserSchema,
  updateSelfSchema,
  updateUserSchema,
} from './user.schema';

const idParamSchema = z.object({ id: z.string().uuid() });

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const users = await service.list();
  res.json({ data: users });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const user = await service.getById(id);
  res.json({ data: user });
});

export const invite = asyncHandler(async (req: Request, res: Response) => {
  const dto = inviteUserSchema.parse(req.body);
  const user = await service.invite(dto);
  res.status(201).json({ data: user });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const dto = updateUserSchema.parse(req.body);
  const user = await service.update(id, dto);
  res.json({ data: user });
});

export const changeRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const dto = changeRoleSchema.parse(req.body);
  const user = await service.changeRole(id, dto, req.user.sub);
  res.json({ data: user });
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  await service.deactivate(id, req.user.sub);
  res.status(204).send();
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.getById(req.user.sub);
  res.json({ data: user });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateSelfSchema.parse(req.body);
  const user = await service.updateSelf(req.user.sub, dto);
  res.json({ data: user });
});
