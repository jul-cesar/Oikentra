import type {
	Task,
	TaskFilters,
	TaskPriority,
	TaskStatus,
} from "@/lib/tasks-api";

// Pure board rules, kept free of React so node:test can run them.

const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];
const views = { mias: "mine", "sin-asignar": "unassigned" } as const;

export const taskStatusLabels: Record<TaskStatus, string> = {
	TODO: "Pendiente",
	IN_PROGRESS: "En curso",
	DONE: "Completada",
};
export const taskPriorityLabels: Record<TaskPriority, string> = {
	LOW: "Baja",
	MEDIUM: "Media",
	HIGH: "Alta",
};

export type TaskView = "all" | "mine" | "unassigned";
export type TaskBoardFilters = {
	view: TaskView;
	memberId: string;
	priority: TaskPriority | "";
	search: string;
};
type Role = "OWNER" | "MANAGER" | "OPERATOR";

export function parseTaskBoardFilters(params: {
	get(name: string): string | null;
}): TaskBoardFilters {
	const view = params.get("vista") ?? "";
	const priority = params.get("prioridad") ?? "";
	return {
		view: view in views ? views[view as keyof typeof views] : "all",
		memberId: params.get("integrante") ?? "",
		priority: priorities.includes(priority as TaskPriority)
			? (priority as TaskPriority)
			: "",
		search: params.get("q") ?? "",
	};
}

export function taskBoardQueryString(filters: TaskBoardFilters) {
	const query = new URLSearchParams();
	if (filters.view !== "all") {
		query.set("vista", filters.view === "mine" ? "mias" : "sin-asignar");
	}
	if (filters.memberId) query.set("integrante", filters.memberId);
	if (filters.priority) query.set("prioridad", filters.priority);
	if (filters.search) query.set("q", filters.search);
	return query.toString();
}

export function toTaskApiFilters(filters: TaskBoardFilters): TaskFilters {
	return {
		...(filters.view === "mine" ? { mine: true } : {}),
		...(filters.view === "unassigned" ? { unassigned: true } : {}),
		...(filters.view === "all" && filters.memberId
			? { assigneeMemberId: filters.memberId }
			: {}),
		...(filters.priority ? { priority: filters.priority } : {}),
		...(filters.search.trim() ? { search: filters.search.trim() } : {}),
	};
}

// Due date ascending (undated last), then newest first. No manual order exists.
function compareTasks(a: Task, b: Task) {
	if (a.dueAt !== b.dueAt) {
		if (!a.dueAt) return 1;
		if (!b.dueAt) return -1;
		return a.dueAt < b.dueAt ? -1 : 1;
	}
	return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}

export function groupTasksByStatus(tasks: Task[]) {
	const columns = Object.fromEntries(
		statuses.map((status) => [status, [] as Task[]]),
	) as Record<TaskStatus, Task[]>;
	for (const task of [...tasks].sort(compareTasks)) columns[task.status].push(task);
	return columns;
}

export function canChangeTaskStatus({
	role,
	memberId,
	task,
}: {
	role: Role;
	memberId: string | undefined;
	task: Pick<Task, "assigneeMemberId">;
}) {
	return (
		role !== "OPERATOR" ||
		(memberId !== undefined && task.assigneeMemberId === memberId)
	);
}

export function assignableMembers<T extends { id: string }>({
	role,
	memberId,
	members,
}: {
	role: Role;
	memberId: string | undefined;
	members: T[];
}) {
	return role === "OPERATOR"
		? members.filter((member) => member.id === memberId)
		: members;
}

export function taskErrorMessage(error: Error & { code?: string }) {
	return error.code === "TASK_VERSION_CONFLICT"
		? "Otro integrante modificó esta tarea. Recargamos la información más reciente."
		: error.message;
}

// Conversation reads oldest first, like a chat.
export function sortTaskComments<T extends { createdAt: string }>(comments: T[]) {
	return [...comments].sort((a, b) =>
		a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
	);
}

export function canDeleteTaskAttachment(role: Role) {
	return role !== "OPERATOR";
}
