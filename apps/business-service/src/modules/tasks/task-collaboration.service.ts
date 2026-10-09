import type { z } from "zod";

import type {
	BusinessMember,
	Task,
	TaskAttachment,
	TaskComment,
} from "../../db/schema";
import { AppError, validationError } from "../../http/errors";
import {
	privateObjectStorage,
	type PrivateObjectStorage,
} from "../../storage/r2-client";
import { membersService, permissions } from "../businesses/members.service";
import {
	taskCollaborationRepository,
	type TaskCollaborationRepository,
} from "./tasks.repository";
import {
	confirmTaskAttachmentSchema,
	createTaskCommentSchema,
	requestTaskAttachmentUploadSchema,
} from "./tasks.schemas";
import type {
	ConfirmTaskAttachmentInput,
	CreateTaskCommentInput,
	RequestTaskAttachmentUploadInput,
	TaskAttachmentResponse,
	TaskCommentResponse,
} from "./types/tasks.types";

type Authorize = (input: {
	userId: string;
	businessId: string;
	permission: string;
}) => Promise<BusinessMember>;

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_TASK = 10;
const UPLOAD_EXPIRES_SECONDS = 300;
const DOWNLOAD_EXPIRES_SECONDS = 60;
const SIGNATURE_BYTES = 12;

const startsWith = (bytes: Uint8Array, prefix: number[], offset = 0) =>
	prefix.every((byte, index) => bytes[offset + index] === byte);

// Real file signatures; the browser-declared type is never trusted on its own.
const ATTACHMENT_TYPES: Record<
	string,
	{ extension: string; matches: (head: Uint8Array) => boolean }
> = {
	"image/jpeg": {
		extension: "jpg",
		matches: (head) => startsWith(head, [0xff, 0xd8, 0xff]),
	},
	"image/png": {
		extension: "png",
		matches: (head) =>
			startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
	},
	"image/webp": {
		extension: "webp",
		matches: (head) =>
			startsWith(head, [0x52, 0x49, 0x46, 0x46]) &&
			startsWith(head, [0x57, 0x45, 0x42, 0x50], 8),
	},
	"application/pdf": {
		extension: "pdf",
		matches: (head) => startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d]),
	},
};

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success) throw validationError(result.error);
	return result.data;
}

function toCommentResponse(comment: TaskComment): TaskCommentResponse {
	return {
		id: comment.id,
		taskId: comment.taskId,
		authorUserId: comment.authorUserId,
		body: comment.body,
		createdAt: comment.createdAt.toISOString(),
	};
}

function toAttachmentResponse(attachment: TaskAttachment): TaskAttachmentResponse {
	return {
		id: attachment.id,
		taskId: attachment.taskId,
		uploadedByUserId: attachment.uploadedByUserId,
		fileName: attachment.fileName,
		contentType: attachment.contentType,
		sizeBytes: attachment.sizeBytes,
		createdAt: attachment.createdAt.toISOString(),
	};
}

function invalidAttachment(message: string) {
	return new AppError("TASK_ATTACHMENT_INVALID", 400, message);
}

function limitReached() {
	return new AppError(
		"TASK_ATTACHMENT_LIMIT_REACHED",
		409,
		`A task can have at most ${MAX_ATTACHMENTS_PER_TASK} attachments.`,
	);
}

export function createTaskCollaborationService({
	repository = taskCollaborationRepository,
	storage = privateObjectStorage,
	now = () => new Date(),
	authorize = ({ userId, businessId, permission }) =>
		membersService.requirePermission(userId, businessId, permission),
}: {
	repository?: TaskCollaborationRepository;
	storage?: PrivateObjectStorage;
	now?: () => Date;
	authorize?: Authorize;
} = {}) {
	async function requireTask(businessId: string, taskId: string): Promise<Task> {
		const task = await repository.findByIdAndBusiness(taskId, businessId);
		if (!task) {
			throw new AppError("TASK_NOT_FOUND", 404, "The task was not found.");
		}
		return task;
	}

	async function deleteObject(objectKey: string) {
		try {
			await storage.delete(objectKey);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError(
				"TASK_ATTACHMENT_STORAGE_FAILED",
				502,
				"The attachment storage could not complete the request.",
			);
		}
	}

	async function rejectUpload(objectKey: string, error: AppError): Promise<never> {
		await deleteObject(objectKey);
		throw error;
	}

	function requireSupportedType(contentType: string) {
		const type = ATTACHMENT_TYPES[contentType];
		if (!type) {
			throw new AppError(
				"TASK_ATTACHMENT_TYPE_UNSUPPORTED",
				400,
				"Attachments must be JPEG, PNG, WebP, or PDF.",
			);
		}
		return type;
	}

	function requireAllowedSize(sizeBytes: number) {
		if (sizeBytes > MAX_ATTACHMENT_BYTES) {
			throw new AppError(
				"TASK_ATTACHMENT_TOO_LARGE",
				400,
				"Attachments can be at most 10 MB.",
			);
		}
	}

	async function listFor(
		permission: string,
		input: { userId: string; businessId: string; taskId: string },
	) {
		await authorize({ userId: input.userId, businessId: input.businessId, permission });
		await requireTask(input.businessId, input.taskId);
	}

	async function deleteAttachmentRecord(attachment: TaskAttachment) {
		await deleteObject(attachment.objectKey);
		await repository.deleteAttachment(
			attachment.id,
			attachment.taskId,
			attachment.businessId,
		);
	}

	return {
		async listComments(input: {
			userId: string;
			businessId: string;
			taskId: string;
		}) {
			await listFor(permissions.tasksRead, input);
			return (await repository.listComments(input.taskId, input.businessId)).map(
				toCommentResponse,
			);
		},

		async createComment({
			userId,
			businessId,
			taskId,
			input,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
			input: CreateTaskCommentInput;
		}) {
			const { body } = parse(createTaskCommentSchema, input);
			await authorize({ userId, businessId, permission: permissions.tasksComment });
			await requireTask(businessId, taskId);
			return toCommentResponse(
				await repository.createComment({
					id: crypto.randomUUID(),
					businessId,
					taskId,
					authorUserId: userId,
					body,
					createdAt: now(),
				}),
			);
		},

		async listAttachments(input: {
			userId: string;
			businessId: string;
			taskId: string;
		}) {
			await listFor(permissions.tasksRead, input);
			return (
				await repository.listAttachments(input.taskId, input.businessId)
			).map(toAttachmentResponse);
		},

		async requestAttachmentUpload({
			userId,
			businessId,
			taskId,
			input,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
			input: RequestTaskAttachmentUploadInput;
		}) {
			const file = parse(requestTaskAttachmentUploadSchema, input);
			await authorize({ userId, businessId, permission: permissions.tasksAttach });
			await requireTask(businessId, taskId);
			const { extension } = requireSupportedType(file.contentType);
			requireAllowedSize(file.sizeBytes);
			if (
				(await repository.listAttachments(taskId, businessId)).length >=
				MAX_ATTACHMENTS_PER_TASK
			) {
				throw limitReached();
			}
			const objectKey = `task-attachments/${businessId}/${taskId}/${crypto.randomUUID()}.${extension}`;
			return {
				uploadUrl: await storage.signUpload({
					key: objectKey,
					contentType: file.contentType,
					sizeBytes: file.sizeBytes,
					expiresIn: UPLOAD_EXPIRES_SECONDS,
				}),
				objectKey,
				expiresIn: UPLOAD_EXPIRES_SECONDS,
				headers: { "Content-Type": file.contentType },
			};
		},

		async confirmAttachmentUpload({
			userId,
			businessId,
			taskId,
			input,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
			input: ConfirmTaskAttachmentInput;
		}) {
			const file = parse(confirmTaskAttachmentSchema, input);
			await authorize({ userId, businessId, permission: permissions.tasksAttach });
			await requireTask(businessId, taskId);

			// Only keys minted by requestAttachmentUpload for this task are accepted,
			// so a forged key can never delete or register someone else's object.
			const keyPrefix = `task-attachments/${businessId}/${taskId}/`;
			const keyExtension = file.objectKey.startsWith(keyPrefix)
				? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/.exec(
						file.objectKey.slice(keyPrefix.length),
					)?.[1]
				: undefined;
			if (!keyExtension) {
				throw new AppError(
					"TASK_ATTACHMENT_KEY_INVALID",
					400,
					"The attachment key is not valid for this task.",
				);
			}

			const existing = await repository.findAttachmentByObjectKey(file.objectKey);
			if (existing) return toAttachmentResponse(existing);

			const type = ATTACHMENT_TYPES[file.contentType];
			if (!type || type.extension !== keyExtension) {
				return rejectUpload(
					file.objectKey,
					new AppError(
						"TASK_ATTACHMENT_TYPE_UNSUPPORTED",
						400,
						"Attachments must be JPEG, PNG, WebP, or PDF.",
					),
				);
			}

			const head = await storage.head(file.objectKey);
			if (!head) throw invalidAttachment("The uploaded object was not found.");
			if (head.sizeBytes > MAX_ATTACHMENT_BYTES) {
				return rejectUpload(
					file.objectKey,
					new AppError(
						"TASK_ATTACHMENT_TOO_LARGE",
						400,
						"Attachments can be at most 10 MB.",
					),
				);
			}
			if (
				head.sizeBytes !== file.sizeBytes ||
				head.contentType?.toLowerCase() !== file.contentType
			) {
				return rejectUpload(
					file.objectKey,
					invalidAttachment("The uploaded object does not match its declaration."),
				);
			}
			if (
				(await repository.listAttachments(taskId, businessId)).length >=
				MAX_ATTACHMENTS_PER_TASK
			) {
				return rejectUpload(file.objectKey, limitReached());
			}
			const start = await storage.readStart(file.objectKey, SIGNATURE_BYTES);
			if (!type.matches(start)) {
				return rejectUpload(
					file.objectKey,
					invalidAttachment("The file content does not match its declared type."),
				);
			}

			return toAttachmentResponse(
				await repository.createAttachment({
					id: crypto.randomUUID(),
					businessId,
					taskId,
					uploadedByUserId: userId,
					objectKey: file.objectKey,
					fileName: file.fileName,
					contentType: file.contentType,
					sizeBytes: head.sizeBytes,
					createdAt: now(),
				}),
			);
		},

		async getAttachmentDownload({
			userId,
			businessId,
			taskId,
			attachmentId,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
			attachmentId: string;
		}) {
			await listFor(permissions.tasksRead, { userId, businessId, taskId });
			const attachment = await repository.findAttachment(
				attachmentId,
				taskId,
				businessId,
			);
			if (!attachment) {
				throw new AppError(
					"TASK_ATTACHMENT_NOT_FOUND",
					404,
					"The attachment was not found.",
				);
			}
			return {
				downloadUrl: await storage.signDownload({
					key: attachment.objectKey,
					fileName: attachment.fileName,
					contentType: attachment.contentType,
					expiresIn: DOWNLOAD_EXPIRES_SECONDS,
				}),
				expiresIn: DOWNLOAD_EXPIRES_SECONDS,
			};
		},

		async deleteAttachment({
			userId,
			businessId,
			taskId,
			attachmentId,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
			attachmentId: string;
		}) {
			await listFor(permissions.tasksManage, { userId, businessId, taskId });
			const attachment = await repository.findAttachment(
				attachmentId,
				taskId,
				businessId,
			);
			if (!attachment) {
				throw new AppError(
					"TASK_ATTACHMENT_NOT_FOUND",
					404,
					"The attachment was not found.",
				);
			}
			await deleteAttachmentRecord(attachment);
		},

		// R2 objects go first; a storage failure stops here and the task stays retryable.
		async removeTask({
			userId,
			businessId,
			taskId,
		}: {
			userId: string;
			businessId: string;
			taskId: string;
		}) {
			await listFor(permissions.tasksManage, { userId, businessId, taskId });
			for (const attachment of await repository.listAttachments(taskId, businessId)) {
				await deleteAttachmentRecord(attachment);
			}
			await repository.remove(taskId, businessId);
		},
	};
}

export const taskCollaborationService = createTaskCollaborationService();
