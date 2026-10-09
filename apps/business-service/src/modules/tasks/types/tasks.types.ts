import type { z } from "zod";

import type {
	assignTaskSchema,
	changeTaskStatusSchema,
	createTaskSchema,
	taskFiltersSchema,
	updateTaskSchema,
} from "../tasks.schemas";

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ChangeTaskStatusInput = z.infer<typeof changeTaskStatusSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
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
