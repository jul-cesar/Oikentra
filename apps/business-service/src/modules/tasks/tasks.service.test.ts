import { describe, expect, test } from "bun:test";

import type { BusinessMember, MemberRole, NewTask, Task } from "../../db/schema";
import { createMembersService } from "../businesses/members.service";
import type { MemberRepository } from "../businesses/members.repository";
import { createTasksService } from "./tasks.service";
import type { TaskRepository } from "./tasks.repository";

const businessId = "business-a";
const now = new Date("2026-10-08T12:00:00.000Z");

function member(input: {
	userId: string;
	role: MemberRole;
	businessId?: string;
	status?: BusinessMember["status"];
}): BusinessMember {
	return {
		id: crypto.randomUUID(),
		businessId: input.businessId ?? businessId,
		userId: input.userId,
		role: input.role,
		status: input.status ?? "ACTIVE",
		createdAt: now,
		updatedAt: now,
	};
}

function task(input: Partial<Task> = {}): Task {
	return {
		id: crypto.randomUUID(),
		businessId,
		createdByUserId: "owner-a",
		assigneeMemberId: null,
		title: "Inventario",
		description: null,
		status: "TODO",
		priority: "MEDIUM",
		dueAt: null,
		completedAt: null,
		version: 1,
		createdAt: now,
		updatedAt: now,
		...input,
	};
}

function createMemberRepository(members: BusinessMember[]): MemberRepository {
	return {
		async findActiveByBusinessAndUser(candidateBusinessId, userId) {
			return (
				members.find(
					(member) =>
						member.businessId === candidateBusinessId &&
						member.userId === userId &&
						member.status === "ACTIVE",
				) ?? null
			);
		},
		async listByBusiness(candidateBusinessId) {
			return members.filter(
				(member) =>
					member.businessId === candidateBusinessId && member.status === "ACTIVE",
			);
		},
	} as MemberRepository;
}

function createTaskRepository(members: BusinessMember[]): TaskRepository {
	const records = new Map<string, Task>();
	return {
		async create(input: NewTask) {
			const record = input as Task;
			records.set(record.id, record);
			return record;
		},
		async listByBusiness({ businessId: candidateBusinessId, filters }) {
			return Array.from(records.values()).filter((record) => {
				if (record.businessId !== candidateBusinessId) return false;
				if (filters.status && record.status !== filters.status) return false;
				if (filters.priority && record.priority !== filters.priority) return false;
				if (
					filters.assigneeMemberId &&
					record.assigneeMemberId !== filters.assigneeMemberId
				)
					return false;
				if (filters.unassigned && record.assigneeMemberId !== null) return false;
				if (
					filters.search &&
					!`${record.title} ${record.description ?? ""}`
						.toLowerCase()
						.includes(filters.search.toLowerCase())
				)
					return false;
				return true;
			});
		},
		async findByIdAndBusiness(taskId, candidateBusinessId) {
			const record = records.get(taskId);
			return record?.businessId === candidateBusinessId ? record : null;
		},
		async findActiveMember(candidateBusinessId, memberId) {
			return (
				members.find(
					(member) =>
						member.id === memberId &&
						member.businessId === candidateBusinessId &&
						member.status === "ACTIVE",
				) ?? null
			);
		},
		async update({ taskId, businessId: candidateBusinessId, version, patch }) {
			const record = records.get(taskId);
			if (
				!record ||
				record.businessId !== candidateBusinessId ||
				record.version !== version
			)
				return null;
			const updated = { ...record, ...patch, version: record.version + 1 };
			records.set(taskId, updated);
			return updated;
		},
		async remove(taskId, candidateBusinessId) {
			const record = records.get(taskId);
			if (!record || record.businessId !== candidateBusinessId) return null;
			records.delete(taskId);
			return record;
		},
	};
}

function createContext() {
	const members = [
		member({ userId: "owner-a", role: "OWNER" }),
		member({ userId: "manager-a", role: "MANAGER" }),
		member({ userId: "operator-a", role: "OPERATOR" }),
		member({ userId: "operator-b", role: "OPERATOR" }),
		member({ userId: "inactive-a", role: "OPERATOR", status: "INACTIVE" }),
		member({
			userId: "foreign-a",
			role: "OPERATOR",
			businessId: "business-b",
		}),
	];
	const repository = createTaskRepository(members);
	const membersService = createMembersService(createMemberRepository(members));
	return {
		members,
		repository,
		forUser(userId: string) {
			return createTasksService({
				repository,
				now: () => now,
				authorize: ({ userId, businessId, permission }) =>
					membersService.requirePermission(userId, businessId, permission),
			});
		},
	};
}

function input(assigneeMemberId?: string | null) {
	return {
		title: "Contar productos",
		priority: "HIGH" as const,
		...(assigneeMemberId === undefined ? {} : { assigneeMemberId }),
	};
}

describe("tasks service permissions and domain rules", () => {
	test.each([
		["owner-a", "OWNER"],
		["manager-a", "MANAGER"],
		["operator-a", "OPERATOR"],
	] as const)("allows every active %s to list and create tasks", async (userId) => {
		const context = createContext();
		const service = context.forUser(userId);

		const created = await service.create({ userId, businessId, input: input() });
		const listed = await service.list({ userId, businessId, filters: {} });

		expect(created.title).toBe("Contar productos");
		expect(listed.map((record) => record.id)).toEqual([created.id]);
	});

	test("allows an operator to create unassigned tasks or assign themselves", async () => {
		const context = createContext();
		const service = context.forUser("operator-a");
		const operator = context.members.find(
			(member) => member.userId === "operator-a",
		)!;

		const unassigned = await service.create({
			userId: "operator-a",
			businessId,
			input: input(),
		});
		const assigned = await service.create({
			userId: "operator-a",
			businessId,
			input: input(operator.id),
		});

		expect(unassigned.assigneeMemberId).toBeNull();
		expect(assigned.assigneeMemberId).toBe(operator.id);
	});

	test("rejects an operator assigning a task to somebody else", async () => {
		const context = createContext();
		const other = context.members.find((member) => member.userId === "operator-b")!;

		await expect(
			context.forUser("operator-a").create({
				userId: "operator-a",
				businessId,
				input: input(other.id),
			}),
		).rejects.toMatchObject({ code: "TASK_ASSIGNMENT_FORBIDDEN", status: 403 });
	});

	test.each(["owner-a", "manager-a"])(
		"allows %s to assign any active member in the business",
		async (userId) => {
			const context = createContext();
			const other = context.members.find(
				(member) => member.userId === "operator-b",
			)!;

			const created = await context.forUser(userId).create({
				userId,
				businessId,
				input: input(other.id),
			});

			expect(created.assigneeMemberId).toBe(other.id);
		},
	);

	test("allows an assignee to change their task status and maintains completedAt", async () => {
		const context = createContext();
		const operator = context.members.find(
			(member) => member.userId === "operator-a",
		)!;
		const service = context.forUser("operator-a");
		const created = await service.create({
			userId: "operator-a",
			businessId,
			input: input(operator.id),
		});

		const completed = await service.changeStatus({
			userId: "operator-a",
			businessId,
			taskId: created.id,
			input: { version: created.version, status: "DONE" },
		});
		const reopened = await service.changeStatus({
			userId: "operator-a",
			businessId,
			taskId: created.id,
			input: { version: completed.version, status: "TODO" },
		});

		expect(completed.completedAt).toBe(now.toISOString());
		expect(reopened.completedAt).toBeNull();
	});

	test("rejects an operator changing somebody else's task", async () => {
		const context = createContext();
		const other = context.members.find((member) => member.userId === "operator-b")!;
		const foreignTask = await context.repository.create(
			task({ assigneeMemberId: other.id }) as NewTask,
		);

		await expect(
			context.forUser("operator-a").changeStatus({
				userId: "operator-a",
				businessId,
				taskId: foreignTask.id,
				input: { version: foreignTask.version, status: "DONE" },
			}),
		).rejects.toMatchObject({ code: "TASK_STATUS_FORBIDDEN", status: 403 });
	});

	test("allows an operator creator to edit their unfinished task", async () => {
		const context = createContext();
		const service = context.forUser("operator-a");
		const created = await service.create({
			userId: "operator-a",
			businessId,
			input: input(),
		});

		const updated = await service.update({
			userId: "operator-a",
			businessId,
			taskId: created.id,
			input: { version: created.version, title: "Inventario contado" },
		});

		expect(updated.title).toBe("Inventario contado");
	});

	test("rejects a stale task version with TASK_VERSION_CONFLICT", async () => {
		const context = createContext();
		const service = context.forUser("manager-a");
		const created = await service.create({
			userId: "manager-a",
			businessId,
			input: input(),
		});
		await service.update({
			userId: "manager-a",
			businessId,
			taskId: created.id,
			input: { version: created.version, title: "Actualizada" },
		});

		await expect(
			service.update({
				userId: "manager-a",
				businessId,
				taskId: created.id,
				input: { version: created.version, title: "Obsoleta" },
			}),
		).rejects.toMatchObject({ code: "TASK_VERSION_CONFLICT", status: 409 });
	});

	test("rejects an input version that differs from the authorized snapshot", async () => {
		const context = createContext();
		const operator = context.members.find(
			(member) => member.userId === "operator-a",
		)!;
		const membersService = createMembersService(
			createMemberRepository(context.members),
		);
		// A manager's concurrent change moved each stored row to v3 after the operator's v2 snapshot was read.
		const snapshots = new Map<string, Task>();
		const racingService = createTasksService({
			repository: {
				...context.repository,
				findByIdAndBusiness: async (taskId) => snapshots.get(taskId) ?? null,
			},
			now: () => now,
			authorize: ({ userId, businessId, permission }) =>
				membersService.requirePermission(userId, businessId, permission),
		});
		async function stale(input: Partial<Task>) {
			const stored = await context.repository.create(
				task({ ...input, version: 3 }) as NewTask,
			);
			snapshots.set(stored.id, { ...stored, version: 2 });
			return stored;
		}
		const own = await stale({ createdByUserId: "operator-a" });
		const assigned = await stale({ assigneeMemberId: operator.id });
		const unassigned = await stale({});

		await expect(
			racingService.update({
				userId: "operator-a",
				businessId,
				taskId: own.id,
				input: { version: 3, title: "Carrera" },
			}),
		).rejects.toMatchObject({ code: "TASK_VERSION_CONFLICT", status: 409 });
		await expect(
			racingService.changeStatus({
				userId: "operator-a",
				businessId,
				taskId: assigned.id,
				input: { version: 3, status: "DONE" },
			}),
		).rejects.toMatchObject({ code: "TASK_VERSION_CONFLICT", status: 409 });
		await expect(
			racingService.assign({
				userId: "operator-a",
				businessId,
				taskId: unassigned.id,
				input: { version: 3, assigneeMemberId: operator.id },
			}),
		).rejects.toMatchObject({ code: "TASK_VERSION_CONFLICT", status: 409 });
	});

	test("requires tasks.manage to remove a task", async () => {
		const context = createContext();
		const created = await context.forUser("manager-a").create({
			userId: "manager-a",
			businessId,
			input: input(),
		});

		await expect(
			context.forUser("operator-a").remove({
				userId: "operator-a",
				businessId,
				taskId: created.id,
			}),
		).rejects.toMatchObject({ code: "BUSINESS_PERMISSION_DENIED", status: 403 });
		await expect(
			context.forUser("manager-a").remove({
				userId: "manager-a",
				businessId,
				taskId: created.id,
			}),
		).resolves.toMatchObject({ id: created.id });
	});

	test("rejects inactive and cross-business assignees", async () => {
		const context = createContext();
		const inactive = context.members.find(
			(member) => member.userId === "inactive-a",
		)!;
		const foreign = context.members.find(
			(member) => member.userId === "foreign-a",
		)!;
		const service = context.forUser("manager-a");

		for (const assigneeMemberId of [inactive.id, foreign.id]) {
			await expect(
				service.create({
					userId: "manager-a",
					businessId,
					input: input(assigneeMemberId),
				}),
			).rejects.toMatchObject({ code: "TASK_ASSIGNEE_INVALID", status: 400 });
		}
	});
});
