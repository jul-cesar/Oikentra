import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
	businessMembers,
	tasks,
	type BusinessMember,
	type NewTask,
	type Task,
} from "../../db/schema";
import type { TaskFilters } from "./types/tasks.types";

type TaskPatch = Partial<
	Pick<
		Task,
		| "title"
		| "description"
		| "priority"
		| "dueAt"
		| "status"
		| "completedAt"
		| "assigneeMemberId"
		| "updatedAt"
	>
>;

export type TaskRepository = {
	create(input: NewTask): Promise<Task>;
	listByBusiness(input: {
		businessId: string;
		filters: Omit<TaskFilters, "mine">;
	}): Promise<Task[]>;
	findByIdAndBusiness(taskId: string, businessId: string): Promise<Task | null>;
	findActiveMember(
		businessId: string,
		memberId: string,
	): Promise<BusinessMember | null>;
	update(input: {
		taskId: string;
		businessId: string;
		version: number;
		patch: TaskPatch;
	}): Promise<Task | null>;
	remove(taskId: string, businessId: string): Promise<Task | null>;
};

export const taskRepository: TaskRepository = {
	async create(input) {
		const [task] = await getDb().insert(tasks).values(input).returning();
		return task;
	},

	async listByBusiness({ businessId, filters }) {
		const conditions = [eq(tasks.businessId, businessId)];
		if (filters.status) conditions.push(eq(tasks.status, filters.status));
		if (filters.priority) conditions.push(eq(tasks.priority, filters.priority));
		if (filters.assigneeMemberId)
			conditions.push(eq(tasks.assigneeMemberId, filters.assigneeMemberId));
		if (filters.unassigned) conditions.push(isNull(tasks.assigneeMemberId));
		if (filters.search) {
			const pattern = `%${filters.search}%`;
			conditions.push(
				or(ilike(tasks.title, pattern), ilike(tasks.description, pattern))!,
			);
		}
		return getDb()
			.select()
			.from(tasks)
			.where(and(...conditions))
			.orderBy(asc(tasks.dueAt), desc(tasks.createdAt));
	},

	async findByIdAndBusiness(taskId, businessId) {
		const [task] = await getDb()
			.select()
			.from(tasks)
			.where(and(eq(tasks.id, taskId), eq(tasks.businessId, businessId)))
			.limit(1);
		return task ?? null;
	},

	async findActiveMember(businessId, memberId) {
		const [member] = await getDb()
			.select()
			.from(businessMembers)
			.where(
				and(
					eq(businessMembers.id, memberId),
					eq(businessMembers.businessId, businessId),
					eq(businessMembers.status, "ACTIVE"),
				),
			)
			.limit(1);
		return member ?? null;
	},

	async update({ taskId, businessId, version, patch }) {
		const [task] = await getDb()
			.update(tasks)
			.set({ ...patch, version: sql`${tasks.version} + 1` })
			.where(
				and(
					eq(tasks.id, taskId),
					eq(tasks.businessId, businessId),
					eq(tasks.version, version),
				),
			)
			.returning();
		return task ?? null;
	},

	async remove(taskId, businessId) {
		const [task] = await getDb()
			.delete(tasks)
			.where(and(eq(tasks.id, taskId), eq(tasks.businessId, businessId)))
			.returning();
		return task ?? null;
	},
};
