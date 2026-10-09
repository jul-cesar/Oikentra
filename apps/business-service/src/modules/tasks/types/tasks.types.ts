import type { z } from "zod";

import type {
	assignTaskSchema,
	changeTaskStatusSchema,
	confirmTaskAttachmentSchema,
	createTaskCommentSchema,
	createTaskSchema,
	requestTaskAttachmentUploadSchema,
	taskFiltersSchema,
	updateTaskSchema,
} from "../tasks.schemas";

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ChangeTaskStatusInput = z.infer<typeof changeTaskStatusSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>;
export type RequestTaskAttachmentUploadInput = z.infer<
	typeof requestTaskAttachmentUploadSchema
>;
export type ConfirmTaskAttachmentInput = z.infer<
	typeof confirmTaskAttachmentSchema
>;
export type TaskFilters = z.infer<typeof taskFiltersSchema>;

export type TaskResponse = {
	id: string;
	businessId: string;
	createdByUserId: string;
	assigneeMemberId: string | null;
	title: string;
	description: string | null;
	status: "TODO" | "IN_PROGRESS" | "DONE";
	priority: "LOW" | "MEDIUM" | "HIGH";
	dueAt: string | null;
	completedAt: string | null;
	version: number;
	createdAt: string;
	updatedAt: string;
};

export type TaskCommentResponse = {
	id: string;
	taskId: string;
	authorUserId: string;
	body: string;
	createdAt: string;
};

export type TaskAttachmentResponse = {
	id: string;
	taskId: string;
	uploadedByUserId: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	createdAt: string;
};
