import { z } from "zod";

import { taskPriorities, taskStatuses } from "../../db/schema";

const instant = z.string().datetime({ offset: true });
const editableTaskFields = {
	title: z.string().trim().min(1).max(160),
	description: z.string().trim().max(1_000).nullable().optional(),
	priority: z.enum(taskPriorities),
	dueAt: instant.nullable().optional(),
};

export const createTaskSchema = z.object({
	...editableTaskFields,
	assigneeMemberId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z.object({
	version: z.number().int().positive(),
	title: editableTaskFields.title.optional(),
	description: editableTaskFields.description,
	priority: editableTaskFields.priority.optional(),
	dueAt: editableTaskFields.dueAt,
});

export const changeTaskStatusSchema = z.object({
	version: z.number().int().positive(),
	status: z.enum(taskStatuses),
});

export const assignTaskSchema = z.object({
	version: z.number().int().positive(),
	assigneeMemberId: z.string().uuid().nullable(),
});

export const taskFiltersSchema = z.object({
	status: z.enum(taskStatuses).optional(),
	priority: z.enum(taskPriorities).optional(),
	assigneeMemberId: z.string().uuid().optional(),
	mine: z.boolean().optional(),
	unassigned: z.boolean().optional(),
	search: z.string().trim().min(1).max(160).optional(),
});
