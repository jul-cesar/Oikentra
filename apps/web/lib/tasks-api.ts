export const taskStatuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

export type Task = {
	id: string;
	businessId: string;
	createdByUserId: string;
	assigneeMemberId: string | null;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	dueAt: string | null;
	completedAt: string | null;
	version: number;
	createdAt: string;
	updatedAt: string;
};

export type TaskComment = {
	id: string;
	taskId: string;
	authorUserId: string;
	body: string;
	createdAt: string;
};

export type TaskAttachment = {
	id: string;
	taskId: string;
	uploadedByUserId: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	createdAt: string;
};

export type TaskFilters = {
	status?: TaskStatus;
	priority?: TaskPriority;
	assigneeMemberId?: string;
	mine?: boolean;
	unassigned?: boolean;
	search?: string;
};

export type CreateTaskInput = {
	title: string;
	description?: string | null;
	priority: TaskPriority;
	dueAt?: string | null;
	assigneeMemberId?: string | null;
};

export type UpdateTaskInput = {
	version: number;
	title?: string;
	description?: string | null;
	priority?: TaskPriority;
	dueAt?: string | null;
};

export type TaskAttachmentUpload = {
	uploadUrl: string;
	objectKey: string;
	expiresIn: number;
	headers: Record<string, string>;
};

async function request<T>({
	url,
	init,
}: {
	url: string;
	init?: RequestInit;
}): Promise<T> {
	const response = await fetch(url, {
		...init,
		credentials: "include",
		headers: { "Content-Type": "application/json", ...init?.headers },
	});
	const body = (await response.json().catch(() => null)) as {
		data?: T;
		message?: string;
		code?: string;
	} | null;
	if (!response.ok || body?.data === undefined) {
		const error = new Error(
			body?.message || "No pudimos completar la solicitud.",
		) as Error & { code?: string };
		error.code = body?.code;
		throw error;
	}
	return body.data;
}

const base = (businessId: string) =>
	`/api/business/businesses/${encodeURIComponent(businessId)}/tasks`;
const taskUrl = (businessId: string, taskId: string) =>
	`${base(businessId)}/${encodeURIComponent(taskId)}`;
const post = (body: unknown): RequestInit => ({
	method: "POST",
	body: JSON.stringify(body),
});

export function getTasks({
	businessId,
	filters = {},
}: {
	businessId: string;
	filters?: TaskFilters;
}) {
	const query = new URLSearchParams();
	for (const [name, value] of Object.entries(filters)) {
		if (value === undefined || value === false || value === "") continue;
		query.set(name, String(value));
	}
	const suffix = query.size ? `?${query}` : "";
	return request<Task[]>({ url: `${base(businessId)}${suffix}` });
}

export function getTask({
	businessId,
	taskId,
}: {
	businessId: string;
	taskId: string;
}) {
	return request<Task>({ url: taskUrl(businessId, taskId) });
}

export function createTask({
	businessId,
	input,
}: {
	businessId: string;
	input: CreateTaskInput;
}) {
	return request<Task>({ url: base(businessId), init: post(input) });
}

export function updateTask({
	businessId,
	taskId,
	input,
}: {
	businessId: string;
	taskId: string;
	input: UpdateTaskInput;
}) {
	return request<Task>({
		url: taskUrl(businessId, taskId),
		init: { method: "PATCH", body: JSON.stringify(input) },
	});
}

export function deleteTask({
	businessId,
	taskId,
}: {
	businessId: string;
	taskId: string;
}) {
	return request<{ id: string }>({
		url: taskUrl(businessId, taskId),
		init: { method: "DELETE" },
	});
}

export function changeTaskStatus({
	businessId,
	taskId,
	version,
	status,
}: {
	businessId: string;
	taskId: string;
	version: number;
	status: TaskStatus;
}) {
	return request<Task>({
		url: `${taskUrl(businessId, taskId)}/status`,
		init: post({ version, status }),
	});
}

export function assignTask({
	businessId,
	taskId,
	version,
	assigneeMemberId,
}: {
	businessId: string;
	taskId: string;
	version: number;
	assigneeMemberId: string | null;
}) {
	return request<Task>({
		url: `${taskUrl(businessId, taskId)}/assignee`,
		init: post({ version, assigneeMemberId }),
	});
}

export function getTaskComments({
	businessId,
	taskId,
}: {
	businessId: string;
	taskId: string;
}) {
	return request<TaskComment[]>({
		url: `${taskUrl(businessId, taskId)}/comments`,
	});
}

export function createTaskComment({
	businessId,
	taskId,
	body,
}: {
	businessId: string;
	taskId: string;
	body: string;
}) {
	return request<TaskComment>({
		url: `${taskUrl(businessId, taskId)}/comments`,
		init: post({ body }),
	});
}

export function getTaskAttachments({
	businessId,
	taskId,
}: {
	businessId: string;
	taskId: string;
}) {
	return request<TaskAttachment[]>({
		url: `${taskUrl(businessId, taskId)}/attachments`,
	});
}

export function getTaskAttachmentDownload({
	businessId,
	taskId,
	attachmentId,
}: {
	businessId: string;
	taskId: string;
	attachmentId: string;
}) {
	return request<{ downloadUrl: string; expiresIn: number }>({
		url: `${taskUrl(businessId, taskId)}/attachments/${encodeURIComponent(attachmentId)}/download`,
	});
}

export function deleteTaskAttachment({
	businessId,
	taskId,
	attachmentId,
}: {
	businessId: string;
	taskId: string;
	attachmentId: string;
}) {
	return request<{ id: string }>({
		url: `${taskUrl(businessId, taskId)}/attachments/${encodeURIComponent(attachmentId)}`,
		init: { method: "DELETE" },
	});
}

// Request a signed URL, PUT the file straight to R2, then confirm it so the
// service can verify the object before registering the attachment.
export async function uploadTaskAttachment({
	businessId,
	taskId,
	file,
}: {
	businessId: string;
	taskId: string;
	file: File;
}) {
	const meta = {
		fileName: file.name,
		contentType: file.type,
		sizeBytes: file.size,
	};
	const upload = await request<TaskAttachmentUpload>({
		url: `${taskUrl(businessId, taskId)}/attachments/upload`,
		init: post(meta),
	});
	const url = new URL(upload.uploadUrl);
	if (
		url.protocol !== "https:" ||
		!url.hostname.endsWith(".r2.cloudflarestorage.com")
	) {
		throw new Error("La URL para subir el archivo no es válida.");
	}
	const response = await fetch(url.toString(), {
		method: "PUT",
		headers: upload.headers,
		body: file,
	});
	if (!response.ok) {
		throw new Error("No pudimos subir el archivo. Intenta de nuevo.");
	}
	return request<TaskAttachment>({
		url: `${taskUrl(businessId, taskId)}/attachments/confirm`,
		init: post({ ...meta, objectKey: upload.objectKey }),
	});
}
