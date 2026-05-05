import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/core/utils/asyncHandler';
import * as service from './project.service';
import {
  createProjectSchema,
  memberSchema,
  updateProjectSchema,
} from './project.schema';

const idParamSchema = z.object({ id: z.string().uuid() });
const memberParamsSchema = z.object({ id: z.string().uuid(), userId: z.string().uuid() });

export const list = asyncHandler(async (req: Request, res: Response) => {
  const projects = await service.list({ sub: req.user.sub, roles: req.user.roles });
  res.json({ data: projects });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const project = await service.getById(id, { sub: req.user.sub, roles: req.user.roles });
  res.json({ data: project });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const dto = createProjectSchema.parse(req.body);
  const project = await service.create(dto, { sub: req.user.sub });
  res.status(201).json({ data: project });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const dto = updateProjectSchema.parse(req.body);
  const project = await service.update(id, dto);
  res.json({ data: project });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  await service.remove(id);
  res.status(204).send();
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const dto = memberSchema.parse(req.body);
  const project = await service.addMember(id, dto);
  res.status(201).json({ data: project });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { id, userId } = memberParamsSchema.parse(req.params);
  const project = await service.removeMember(id, userId);
  res.json({ data: project });
});
