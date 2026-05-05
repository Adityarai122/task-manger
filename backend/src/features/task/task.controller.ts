import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/core/utils/asyncHandler';
import * as service from './task.service';
import {
  createTaskSchema,
  listTasksQuerySchema,
  updateOwnTaskSchema,
  updateTaskSchema,
} from './task.schema';

const idParamSchema = z.object({ id: z.string().uuid() });

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listTasksQuerySchema.parse(req.query);
  const tasks = await service.list({ sub: req.user.sub, roles: req.user.roles }, query);
  res.json({ data: tasks });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const task = await service.getById(id, { sub: req.user.sub, roles: req.user.roles });
  res.json({ data: task });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const dto = createTaskSchema.parse(req.body);
  const task = await service.create(dto, { sub: req.user.sub, roles: req.user.roles });
  res.status(201).json({ data: task });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const dto = updateTaskSchema.parse(req.body);
  const task = await service.update(id, dto);
  res.json({ data: task });
});

export const updateOwn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const dto = updateOwnTaskSchema.parse(req.body);
  const task = await service.updateOwn(id, dto, { sub: req.user.sub });
  res.json({ data: task });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  await service.remove(id);
  res.status(204).send();
});
