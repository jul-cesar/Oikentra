import { z } from "zod";

import { taskPriorities, taskStatuses } from "../../db/schema";

const instant = z.string().datetime({ offset: true });
// Member ids are text primary keys and are not always UUIDs; the service
// verifies the member is ACTIVE in the same business.
const memberId = z.string().trim().min(1).max(64);
const editableTaskFields = {
	title: z.string().trim().min(1).max(160),
	description: z.string().trim().max(1_000).nullable().optional(),
	priority: z.enum(taskPriorities),
	dueAt: instant.nullable().optional(),
};

export const createTaskSchema = z.object({
	...editableTaskFields,
	assigneeMemberId: memberId.nullable().optional(),
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
	assigneeMemberId: memberId.nullable(),
});

export const taskFiltersSchema = z.object({
	status: z.enum(taskStatuses).optional(),
	priority: z.enum(taskPriorities).optional(),
	assigneeMemberId: memberId.optional(),
	mine: z.boolean().optional(),
	unassigned: z.boolean().optional(),
	search: z.string().trim().min(1).max(160).optional(),
});

export const createTaskCommentSchema = z.object({
	body: z.string().trim().min(1).max(1_000),
});

const attachmentFile = {
	fileName: z.string().trim().min(1).max(255),
	contentType: z.string().trim().min(1).max(100),
	sizeBytes: z.number().int().positive(),
};

export const requestTaskAttachmentUploadSchema = z.object(attachmentFile);

export const confirmTaskAttachmentSchema = z.object({
	...attachmentFile,
	objectKey: z.string().min(1).max(300),
});
