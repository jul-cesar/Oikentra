import type { BusinessMember, Task } from "../../db/schema";
import { AppError } from "../../http/errors";
import { membersService, permissions } from "../businesses/members.service";
import {
	taskRepository,
	type TaskRepository,
} from "./tasks.repository";
import type {
	AssignTaskInput,
	ChangeTaskStatusInput,
	CreateTaskInput,
	TaskFilters,
	TaskResponse,
	UpdateTaskInput,
} from "./types/tasks.types";

type Authorize = (input: {
	userId: string;
	businessId: string;
	permission: string;
}) => Promise<BusinessMember>;

function toResponse(task: Task): TaskResponse {
	return {
		id: task.id,
		businessId: task.businessId,
		createdByUserId: task.createdByUserId,
		assigneeMemberId: task.assigneeMemberId,
		title: task.title,
		description: task.description,
		status: task.status,
		priority: task.priority,
		dueAt: task.dueAt?.toISOString() ?? null,
		completedAt: task.completedAt?.toISOString() ?? null,
		version: task.version,
		createdAt: task.createdAt.toISOString(),
		updatedAt: task.updatedAt.toISOString(),
	};
}

function isManager(member: BusinessMember) {
	return member.role === "OWNER" || member.role === "MANAGER";
}

function notFound() {
	return new AppError("TASK_NOT_FOUND", 404, "The task was not found.");
}

function versionConflict() {
	return new AppError(
		"TASK_VERSION_CONFLICT",
		409,
		"The task was modified by another member.",
	);
}

export function createTasksService({
	repository = taskRepository,
	now = () => new Date(),
	authorize = ({ userId, businessId, permission }) =>
		membersService.requirePermission(userId, businessId, permission),
}: {
	repository?: TaskRepository;
	now?: () => Date;
	authorize?: Authorize;
} = {}) {
	async function requireTask(
		businessId: string,
		taskId: string,
	): Promise<Task> {
		const task = await repository.findByIdAndBusiness(taskId, businessId);
		if (!task) throw notFound();
		return task;
	}

	async function requireActiveAssignee(
		businessId: string,
		assigneeMemberId: string | null,
	) {
		if (!assigneeMemberId) return;
		const member = await repository.findActiveMember(businessId, assigneeMemberId);
		if (!member) {
			throw new AppError(
				"TASK_ASSIGNEE_INVALID",
				400,
				"The assignee must be an active member of this business.",
			);
		}
	}

	async function updateOrThrow(input: {
		taskId: string;
		businessId: string;
		version: number;
		patch: Parameters<TaskRepository["update"]>[0]["patch"];
	}) {
		const updated = await repository.update(input);
		if (updated) return updated;
		if (await repository.findByIdAndBusiness(input.taskId, input.businessId)) {
			throw versionConflict();
		}
		throw notFound();
	}

	return {
		async list({
			userId,
			businessId,
			filters,
		}: {
			userId: string;
			businessId: string;
			filters: TaskFilters;
		}) {
			const member = await authorize({
				userId,
				businessId,
				permission: permissions.tasksRead,
			});
			const records = await repository.listByBusiness({
				businessId,
				filters: {
					...filters,
					assigneeMemberId: filters.mine
						? member.id
						: filters.assigneeMemberId,
				},
			});
			return records.map(toResponse);
		},

		async get({
			userId,
			businessId,
			taskId,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
		}) {
			await authorize({ userId, businessId, permission: permissions.tasksRead });
			return toResponse(await requireTask(businessId, taskId));
		},

		async create({
			userId,
			businessId,
			input,
		}: {
			userId: string;
			businessId: string;
			input: CreateTaskInput;
		}) {
			const member = await authorize({
				userId,
				businessId,
				permission: permissions.tasksCreate,
			});
			const assigneeMemberId = input.assigneeMemberId ?? null;
			if (
				member.role === "OPERATOR" &&
				assigneeMemberId !== null &&
				assigneeMemberId !== member.id
			) {
				throw new AppError(
					"TASK_ASSIGNMENT_FORBIDDEN",
					403,
					"Operators can only assign tasks to themselves.",
				);
			}
			await requireActiveAssignee(businessId, assigneeMemberId);
			const timestamp = now();
			return toResponse(
				await repository.create({
					id: crypto.randomUUID(),
					businessId,
					createdByUserId: userId,
					assigneeMemberId,
					title: input.title.trim(),
					description: input.description?.trim() || null,
					status: "TODO",
					priority: input.priority,
					dueAt: input.dueAt ? new Date(input.dueAt) : null,
					completedAt: null,
					version: 1,
					createdAt: timestamp,
					updatedAt: timestamp,
				}),
			);
		},

		async update({
			userId,
			businessId,
			taskId,
			input,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
			input: UpdateTaskInput;
		}) {
			const member = await authorize({
				userId,
				businessId,
				permission: permissions.tasksRead,
			});
			const task = await requireTask(businessId, taskId);
			// Write only against the version that was authorized, not a client-chosen newer one.
			if (input.version !== task.version) throw versionConflict();
			if (isManager(member)) {
				await authorize({
					userId,
					businessId,
					permission: permissions.tasksManage,
				});
			} else if (task.createdByUserId !== userId || task.status === "DONE") {
				throw new AppError(
					"TASK_UPDATE_FORBIDDEN",
					403,
					"You do not have permission to edit this task.",
				);
			}
			const patch: Parameters<TaskRepository["update"]>[0]["patch"] = {
				updatedAt: now(),
			};
			if (input.title !== undefined) patch.title = input.title.trim();
			if (input.description !== undefined)
				patch.description = input.description?.trim() || null;
			if (input.priority !== undefined) patch.priority = input.priority;
			if (input.dueAt !== undefined)
				patch.dueAt = input.dueAt ? new Date(input.dueAt) : null;
			return toResponse(
				await updateOrThrow({
					taskId,
					businessId,
					version: input.version,
					patch,
				}),
			);
		},

		async changeStatus({
			userId,
			businessId,
			taskId,
			input,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
			input: ChangeTaskStatusInput;
		}) {
			const member = await authorize({
				userId,
				businessId,
				permission: permissions.tasksRead,
			});
			const task = await requireTask(businessId, taskId);
			// Write only against the version that was authorized, not a client-chosen newer one.
			if (input.version !== task.version) throw versionConflict();
			if (isManager(member)) {
				await authorize({
					userId,
					businessId,
					permission: permissions.tasksManage,
				});
			} else if (task.assigneeMemberId !== member.id) {
				throw new AppError(
					"TASK_STATUS_FORBIDDEN",
					403,
					"You can only change the status of tasks assigned to you.",
				);
			}
			const timestamp = now();
			return toResponse(
				await updateOrThrow({
					taskId,
					businessId,
					version: input.version,
					patch: {
						status: input.status,
						completedAt: input.status === "DONE" ? timestamp : null,
						updatedAt: timestamp,
					},
				}),
			);
		},

		async assign({
			userId,
			businessId,
			taskId,
			input,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
			input: AssignTaskInput;
		}) {
			const member = await authorize({
				userId,
				businessId,
				permission: permissions.tasksRead,
			});
			const task = await requireTask(businessId, taskId);
			// Write only against the version that was authorized, not a client-chosen newer one.
			if (input.version !== task.version) throw versionConflict();
			if (isManager(member)) {
				await authorize({
					userId,
					businessId,
					permission: permissions.tasksManage,
				});
			} else if (
				task.assigneeMemberId !== null ||
				input.assigneeMemberId !== member.id
			) {
				throw new AppError(
					"TASK_ASSIGNMENT_FORBIDDEN",
					403,
					"Operators can only assign an unassigned task to themselves.",
				);
			}
			await requireActiveAssignee(businessId, input.assigneeMemberId);
			return toResponse(
				await updateOrThrow({
					taskId,
					businessId,
					version: input.version,
					patch: {
						assigneeMemberId: input.assigneeMemberId,
						updatedAt: now(),
					},
				}),
			);
		},

		async remove({
			userId,
			businessId,
			taskId,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
		}) {
			await authorize({
				userId,
				businessId,
				permission: permissions.tasksManage,
			});
			const task = await repository.remove(taskId, businessId);
			if (!task) throw notFound();
			return toResponse(task);
		},
	};
}

export const tasksService = createTasksService();
