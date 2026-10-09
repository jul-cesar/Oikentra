import { describe, expect, test } from "bun:test";

import type {
	BusinessMember,
	MemberRole,
	NewTaskAttachment,
	NewTaskComment,
	Task,
	TaskAttachment,
	TaskComment,
} from "../../db/schema";
import { AppError } from "../../http/errors";
import {
	createPrivateObjectStorage,
	type PrivateObjectStorage,
} from "../../storage/r2-client";
import { createMembersService } from "../businesses/members.service";
import type { MemberRepository } from "../businesses/members.repository";
import { createTaskCollaborationService } from "./task-collaboration.service";
import type { TaskCollaborationRepository } from "./tasks.repository";

const businessId = "business-a";
const now = new Date("2026-10-08T12:00:00.000Z");
const MB = 1024 * 1024;

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0];
const TEXT = Array.from(new TextEncoder().encode("<svg onload=alert(1)>"));

function member(userId: string, role: MemberRole, status: BusinessMember["status"] = "ACTIVE") {
	return {
		id: crypto.randomUUID(),
		businessId,
		userId,
		role,
		status,
		createdAt: now,
		updatedAt: now,
	} satisfies BusinessMember;
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

function createFakeStorage() {
	const objects = new Map<
		string,
		{ bytes: Uint8Array; contentType: string; sizeBytes: number }
	>();
	const deleted: string[] = [];
	const state = { failDelete: false };
	const storage: PrivateObjectStorage = {
		async signUpload({ key }) {
			return `https://r2.test/upload/${key}`;
		},
		async signDownload({ key }) {
			return `https://r2.test/download/${key}`;
		},
		async head(key) {
			const object = objects.get(key);
			return object
				? { sizeBytes: object.sizeBytes, contentType: object.contentType }
				: null;
		},
		async readStart(key, length) {
			const object = objects.get(key);
			if (!object) throw new Error("missing");
			return object.bytes.slice(0, length);
		},
		async delete(key) {
			if (state.failDelete) throw new Error("R2 down");
			deleted.push(key);
			objects.delete(key);
		},
	};
	return {
		storage,
		deleted,
		state,
		has: (key: string) => objects.has(key),
		upload(
			key: string,
			input: { contentType: string; bytes: number[]; sizeBytes?: number },
		) {
			objects.set(key, {
				bytes: new Uint8Array(input.bytes),
				contentType: input.contentType,
				sizeBytes: input.sizeBytes ?? input.bytes.length,
			});
		},
	};
}

function createContext() {
	const members = [
		member("owner-a", "OWNER"),
		member("manager-a", "MANAGER"),
		member("operator-a", "OPERATOR"),
		member("inactive-a", "OPERATOR", "INACTIVE"),
	];
	const memberRepository = {
		async findActiveByBusinessAndUser(candidateBusinessId: string, userId: string) {
			return (
				members.find(
					(item) =>
						item.businessId === candidateBusinessId &&
						item.userId === userId &&
						item.status === "ACTIVE",
				) ?? null
			);
		},
	} as MemberRepository;
	const tasks = new Map<string, Task>();
	const comments: TaskComment[] = [];
	const attachments: TaskAttachment[] = [];
	const repository: TaskCollaborationRepository = {
		async findByIdAndBusiness(taskId, candidateBusinessId) {
			const record = tasks.get(taskId);
			return record?.businessId === candidateBusinessId ? record : null;
		},
		async remove(taskId, candidateBusinessId) {
			const record = tasks.get(taskId);
			if (!record || record.businessId !== candidateBusinessId) return null;
			tasks.delete(taskId);
			for (const list of [comments, attachments]) {
				for (let i = list.length - 1; i >= 0; i--) {
					if (list[i].taskId === taskId) list.splice(i, 1);
				}
			}
			return record;
		},
		async listComments(taskId, candidateBusinessId) {
			return comments
				.filter((c) => c.taskId === taskId && c.businessId === candidateBusinessId)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		},
		async createComment(input: NewTaskComment) {
			comments.push(input as TaskComment);
			return input as TaskComment;
		},
		async listAttachments(taskId, candidateBusinessId) {
			return attachments
				.filter((a) => a.taskId === taskId && a.businessId === candidateBusinessId)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		},
		async findAttachment(attachmentId, taskId, candidateBusinessId) {
			return (
				attachments.find(
					(a) =>
						a.id === attachmentId &&
						a.taskId === taskId &&
						a.businessId === candidateBusinessId,
				) ?? null
			);
		},
		async findAttachmentByObjectKey(objectKey) {
			return attachments.find((a) => a.objectKey === objectKey) ?? null;
		},
		async createAttachment(input: NewTaskAttachment) {
			attachments.push(input as TaskAttachment);
			return input as TaskAttachment;
		},
		async deleteAttachment(attachmentId, taskId, candidateBusinessId) {
			const index = attachments.findIndex(
				(a) =>
					a.id === attachmentId &&
					a.taskId === taskId &&
					a.businessId === candidateBusinessId,
			);
			if (index < 0) return null;
			return attachments.splice(index, 1)[0];
		},
	};
	const fake = createFakeStorage();
	const membersService = createMembersService(memberRepository);
	const service = createTaskCollaborationService({
		repository,
		storage: fake.storage,
		now: () => now,
		authorize: ({ userId, businessId: candidateBusinessId, permission }) =>
			membersService.requirePermission(userId, candidateBusinessId, permission),
	});
	const current = task();
	tasks.set(current.id, current);
	return { service, fake, current, tasks, comments, attachments };
}

async function expectCode(promise: Promise<unknown>, code: string) {
	const error = await promise.then(
		() => null,
		(caught: unknown) => caught,
	);
	expect(error).toBeInstanceOf(AppError);
	expect((error as AppError).code).toBe(code);
}

async function uploadAndConfirm(
	context: ReturnType<typeof createContext>,
	input: { contentType: string; bytes: number[]; sizeBytes?: number } & {
		declaredSize?: number;
		declaredType?: string;
	},
) {
	const upload = await context.service.requestAttachmentUpload({
		userId: "operator-a",
		businessId,
		taskId: context.current.id,
		input: {
			fileName: "evidencia.bin",
			contentType: input.declaredType ?? input.contentType,
			sizeBytes: input.declaredSize ?? input.bytes.length,
		},
	});
	context.fake.upload(upload.objectKey, input);
	return {
		objectKey: upload.objectKey,
		confirm: () =>
			context.service.confirmAttachmentUpload({
				userId: "operator-a",
				businessId,
				taskId: context.current.id,
				input: {
					objectKey: upload.objectKey,
					fileName: "evidencia.bin",
					contentType: input.declaredType ?? input.contentType,
					sizeBytes: input.declaredSize ?? input.bytes.length,
				},
			}),
	};
}

describe("task comments", () => {
	test("rejects empty and oversized comments", async () => {
		const { service, current } = createContext();
		for (const body of ["", "   ", "x".repeat(1_001)]) {
			await expectCode(
				service.createComment({
					userId: "operator-a",
					businessId,
					taskId: current.id,
					input: { body },
				}),
				"VALIDATION_ERROR",
			);
		}
	});

	test("any active member comments and list is ascending with author", async () => {
		const { service, current } = createContext();
		for (const userId of ["operator-a", "manager-a", "owner-a"]) {
			const created = await service.createComment({
				userId,
				businessId,
				taskId: current.id,
				input: { body: ` hola ${userId} ` },
			});
			expect(created.authorUserId).toBe(userId);
			expect(created.body).toBe(`hola ${userId}`);
		}
		const listed = await service.listComments({
			userId: "operator-a",
			businessId,
			taskId: current.id,
		});
		expect(listed.map((c) => c.authorUserId)).toEqual([
			"operator-a",
			"manager-a",
			"owner-a",
		]);
	});

	test("outsiders and inactive members cannot read comments or attachments", async () => {
		const { service, current } = createContext();
		for (const userId of ["outsider", "inactive-a"]) {
			await expectCode(
				service.listComments({ userId, businessId, taskId: current.id }),
				"BUSINESS_ACCESS_DENIED",
			);
			await expectCode(
				service.listAttachments({ userId, businessId, taskId: current.id }),
				"BUSINESS_ACCESS_DENIED",
			);
		}
	});

	test("a task from another business is not found", async () => {
		const { service } = createContext();
		await expectCode(
			service.listComments({
				userId: "owner-a",
				businessId,
				taskId: crypto.randomUUID(),
			}),
			"TASK_NOT_FOUND",
		);
	});
});

describe("task attachment upload request", () => {
	test("accepts only JPEG, PNG, WebP and PDF with server-controlled keys", async () => {
		const { service, current } = createContext();
		const cases = [
			["image/jpeg", "jpg"],
			["image/png", "png"],
			["image/webp", "webp"],
			["application/pdf", "pdf"],
		] as const;
		for (const [contentType, extension] of cases) {
			const upload = await service.requestAttachmentUpload({
				userId: "operator-a",
				businessId,
				taskId: current.id,
				input: { fileName: "a", contentType, sizeBytes: 100 },
			});
			expect(upload.objectKey).toMatch(
				new RegExp(
					`^task-attachments/${businessId}/${current.id}/[0-9a-f-]{36}\\.${extension}$`,
				),
			);
			expect(upload.expiresIn).toBe(300);
			expect(upload.headers["Content-Type"]).toBe(contentType);
		}
		for (const contentType of ["image/svg+xml", "text/html", "application/x-msdownload"]) {
			await expectCode(
				service.requestAttachmentUpload({
					userId: "operator-a",
					businessId,
					taskId: current.id,
					input: { fileName: "a", contentType, sizeBytes: 100 },
				}),
				"TASK_ATTACHMENT_TYPE_UNSUPPORTED",
			);
		}
	});

	test("rejects files over 10 MB and an eleventh attachment", async () => {
		const context = createContext();
		const { service, current, attachments } = context;
		await service.requestAttachmentUpload({
			userId: "operator-a",
			businessId,
			taskId: current.id,
			input: { fileName: "a", contentType: "image/png", sizeBytes: 10 * MB },
		});
		await expectCode(
			service.requestAttachmentUpload({
				userId: "operator-a",
				businessId,
				taskId: current.id,
				input: { fileName: "a", contentType: "image/png", sizeBytes: 10 * MB + 1 },
			}),
			"TASK_ATTACHMENT_TOO_LARGE",
		);
		for (let i = 0; i < 10; i++) {
			attachments.push({
				id: crypto.randomUUID(),
				businessId,
				taskId: current.id,
				uploadedByUserId: "owner-a",
				objectKey: `k${i}`,
				fileName: "f",
				contentType: "image/png",
				sizeBytes: 1,
				createdAt: now,
			});
		}
		await expectCode(
			service.requestAttachmentUpload({
				userId: "operator-a",
				businessId,
				taskId: current.id,
				input: { fileName: "a", contentType: "image/png", sizeBytes: 1 },
			}),
			"TASK_ATTACHMENT_LIMIT_REACHED",
		);
	});
});

describe("task attachment confirmation", () => {
	test("registers metadata only after verifying size, type and file signature", async () => {
		const context = createContext();
		const cases = [
			["image/png", PNG],
			["image/jpeg", JPEG],
			["image/webp", WEBP],
			["application/pdf", PDF],
		] as const;
		for (const [contentType, bytes] of cases) {
			const { confirm } = await uploadAndConfirm(context, {
				contentType,
				bytes: [...bytes],
			});
			const attachment = await confirm();
			expect(attachment.contentType).toBe(contentType);
			expect(attachment).not.toHaveProperty("objectKey");
		}
		const listed = await context.service.listAttachments({
			userId: "operator-a",
			businessId,
			taskId: context.current.id,
		});
		expect(listed).toHaveLength(4);
	});

	test("unconfirmed uploads never appear and are not registered", async () => {
		const context = createContext();
		await uploadAndConfirm(context, { contentType: "image/png", bytes: PNG });
		expect(
			await context.service.listAttachments({
				userId: "owner-a",
				businessId,
				taskId: context.current.id,
			}),
		).toHaveLength(0);
	});

	test("size mismatch deletes the rejected object", async () => {
		const context = createContext();
		const { confirm, objectKey } = await uploadAndConfirm(context, {
			contentType: "image/png",
			bytes: PNG,
			sizeBytes: 999,
			declaredSize: PNG.length,
		});
		await expectCode(confirm(), "TASK_ATTACHMENT_INVALID");
		expect(context.fake.deleted).toEqual([objectKey]);
		expect(context.attachments).toHaveLength(0);
	});

	test("content type mismatch deletes the rejected object", async () => {
		const context = createContext();
		const { confirm, objectKey } = await uploadAndConfirm(context, {
			contentType: "application/pdf",
			bytes: PDF,
			declaredType: "image/png",
		});
		await expectCode(confirm(), "TASK_ATTACHMENT_INVALID");
		expect(context.fake.deleted).toEqual([objectKey]);
		expect(context.attachments).toHaveLength(0);
	});

	test("real file signature must match even when metadata claims a valid type", async () => {
		const context = createContext();
		const { confirm, objectKey } = await uploadAndConfirm(context, {
			contentType: "image/png",
			bytes: TEXT,
		});
		await expectCode(confirm(), "TASK_ATTACHMENT_INVALID");
		expect(context.fake.deleted).toEqual([objectKey]);
		expect(context.fake.has(objectKey)).toBe(false);
		expect(context.attachments).toHaveLength(0);

		const swapped = await uploadAndConfirm(context, {
			contentType: "application/pdf",
			bytes: PNG,
		});
		await expectCode(swapped.confirm(), "TASK_ATTACHMENT_INVALID");
		expect(context.fake.deleted).toContain(swapped.objectKey);
	});

	test("a missing object is rejected", async () => {
		const context = createContext();
		await expectCode(
			context.service.confirmAttachmentUpload({
				userId: "operator-a",
				businessId,
				taskId: context.current.id,
				input: {
					objectKey: `task-attachments/${businessId}/${context.current.id}/${crypto.randomUUID()}.png`,
					fileName: "a.png",
					contentType: "image/png",
					sizeBytes: 10,
				},
			}),
			"TASK_ATTACHMENT_INVALID",
		);
	});

	test("rejects client-chosen keys outside the task prefix without touching R2", async () => {
		const context = createContext();
		const foreign = `task-attachments/other-business/${context.current.id}/${crypto.randomUUID()}.png`;
		context.fake.upload(foreign, { contentType: "image/png", bytes: PNG });
		for (const objectKey of [
			foreign,
			`business-logos/owner-a/${crypto.randomUUID()}.png`,
			`task-attachments/${businessId}/${context.current.id}/../x.png`,
		]) {
			await expectCode(
				context.service.confirmAttachmentUpload({
					userId: "operator-a",
					businessId,
					taskId: context.current.id,
					input: {
						objectKey,
						fileName: "a.png",
						contentType: "image/png",
						sizeBytes: PNG.length,
					},
				}),
				"TASK_ATTACHMENT_KEY_INVALID",
			);
		}
		expect(context.fake.deleted).toEqual([]);
		expect(context.fake.has(foreign)).toBe(true);
	});

	test("a key extension that disagrees with the declared type is rejected and deleted", async () => {
		const context = createContext();
		const key = `task-attachments/${businessId}/${context.current.id}/${crypto.randomUUID()}.pdf`;
		context.fake.upload(key, { contentType: "image/png", bytes: PNG });
		await expectCode(
			context.service.confirmAttachmentUpload({
				userId: "operator-a",
				businessId,
				taskId: context.current.id,
				input: {
					objectKey: key,
					fileName: "a.png",
					contentType: "image/png",
					sizeBytes: PNG.length,
				},
			}),
			"TASK_ATTACHMENT_TYPE_UNSUPPORTED",
		);
		expect(context.fake.deleted).toEqual([key]);
	});

	test("an eleventh confirmed object is rejected and deleted", async () => {
		const context = createContext();
		for (let i = 0; i < 10; i++) {
			context.attachments.push({
				id: crypto.randomUUID(),
				businessId,
				taskId: context.current.id,
				uploadedByUserId: "owner-a",
				objectKey: `k${i}`,
				fileName: "f",
				contentType: "image/png",
				sizeBytes: 1,
				createdAt: now,
			});
		}
		const key = `task-attachments/${businessId}/${context.current.id}/${crypto.randomUUID()}.png`;
		context.fake.upload(key, { contentType: "image/png", bytes: PNG });
		await expectCode(
			context.service.confirmAttachmentUpload({
				userId: "operator-a",
				businessId,
				taskId: context.current.id,
				input: {
					objectKey: key,
					fileName: "a.png",
					contentType: "image/png",
					sizeBytes: PNG.length,
				},
			}),
			"TASK_ATTACHMENT_LIMIT_REACHED",
		);
		expect(context.fake.deleted).toEqual([key]);
	});
});

describe("task attachment download and deletion", () => {
	test("download returns a signed URL, never the public base URL", async () => {
		const context = createContext();
		const { confirm } = await uploadAndConfirm(context, {
			contentType: "image/png",
			bytes: PNG,
		});
		const attachment = await confirm();
		const download = await context.service.getAttachmentDownload({
			userId: "operator-a",
			businessId,
			taskId: context.current.id,
			attachmentId: attachment.id,
		});
		expect(download.downloadUrl).toStartWith("https://r2.test/download/task-attachments/");
		expect(download.expiresIn).toBeLessThanOrEqual(300);
		expect(JSON.stringify(download)).not.toContain("cdn.oikentra.com");
	});

	test("real private storage signs against the private bucket, not the public URL", async () => {
		const names = [
			"DATABASE_URL",
			"INTERNAL_AUTH_PUBLIC_KEY_B64",
			"R2_ACCOUNT_ID",
			"R2_BUCKET",
			"R2_PRIVATE_BUCKET",
			"R2_ACCESS_KEY_ID",
			"R2_SECRET_ACCESS_KEY",
			"R2_PUBLIC_BASE_URL",
		];
		const previous = names.map((name) => process.env[name]);
		Object.assign(process.env, {
			DATABASE_URL: "postgres://x",
			INTERNAL_AUTH_PUBLIC_KEY_B64: "x",
			R2_ACCOUNT_ID: "acct",
			R2_BUCKET: "public-bucket",
			R2_PRIVATE_BUCKET: "private-bucket",
			R2_ACCESS_KEY_ID: "id",
			R2_SECRET_ACCESS_KEY: "secret",
			R2_PUBLIC_BASE_URL: "https://cdn.oikentra.com",
		});
		try {
			const storage = createPrivateObjectStorage();
			const url = await storage.signDownload({
				key: "task-attachments/b/t/f.png",
				fileName: "a b.png",
				contentType: "image/png",
				expiresIn: 60,
			});
			expect(url).toContain("private-bucket");
			expect(url).not.toContain("public-bucket");
			expect(url).not.toContain("cdn.oikentra.com");
			expect(url).toContain("X-Amz-Signature");
		} finally {
			names.forEach((name, i) => {
				if (previous[i] === undefined) delete process.env[name];
				else process.env[name] = previous[i];
			});
		}
	});

	test("without a private bucket attachments answer 503", async () => {
		const names = ["R2_PRIVATE_BUCKET", "DATABASE_URL", "INTERNAL_AUTH_PUBLIC_KEY_B64"];
		const previous = names.map((name) => process.env[name]);
		delete process.env.R2_PRIVATE_BUCKET;
		process.env.DATABASE_URL = "postgres://x";
		process.env.INTERNAL_AUTH_PUBLIC_KEY_B64 = "x";
		try {
			await expectCode(
				createPrivateObjectStorage().delete("k"),
				"TASK_ATTACHMENTS_NOT_CONFIGURED",
			);
		} finally {
			names.forEach((name, i) => {
				if (previous[i] === undefined) delete process.env[name];
				else process.env[name] = previous[i];
			});
		}
	});

	test("only OWNER and MANAGER delete attachments, R2 first then metadata", async () => {
		const context = createContext();
		const { confirm, objectKey } = await uploadAndConfirm(context, {
			contentType: "image/png",
			bytes: PNG,
		});
		const attachment = await confirm();
		await expectCode(
			context.service.deleteAttachment({
				userId: "operator-a",
				businessId,
				taskId: context.current.id,
				attachmentId: attachment.id,
			}),
			"BUSINESS_PERMISSION_DENIED",
		);
		context.fake.state.failDelete = true;
		await expect(
			context.service.deleteAttachment({
				userId: "manager-a",
				businessId,
				taskId: context.current.id,
				attachmentId: attachment.id,
			}),
		).rejects.toThrow();
		expect(context.attachments).toHaveLength(1);
		context.fake.state.failDelete = false;
		await context.service.deleteAttachment({
			userId: "manager-a",
			businessId,
			taskId: context.current.id,
			attachmentId: attachment.id,
		});
		expect(context.fake.deleted).toEqual([objectKey]);
		expect(context.attachments).toHaveLength(0);
	});
});

describe("task removal with private attachments", () => {
	test("stops when R2 fails and can be retried", async () => {
		const context = createContext();
		for (let i = 0; i < 2; i++) {
			await (
				await uploadAndConfirm(context, { contentType: "image/png", bytes: PNG })
			).confirm();
		}
		context.fake.state.failDelete = true;
		await expectCode(
			context.service.removeTask({
				userId: "manager-a",
				businessId,
				taskId: context.current.id,
			}),
			"TASK_ATTACHMENT_STORAGE_FAILED",
		);
		expect(context.tasks.has(context.current.id)).toBe(true);
		expect(context.attachments).toHaveLength(2);

		context.fake.state.failDelete = false;
		await context.service.removeTask({
			userId: "manager-a",
			businessId,
			taskId: context.current.id,
		});
		expect(context.tasks.has(context.current.id)).toBe(false);
		expect(context.fake.deleted).toHaveLength(2);
		expect(context.attachments).toHaveLength(0);
	});

	test("keeps every attachment record when R2 fails partway through", async () => {
		const context = createContext();
		for (let i = 0; i < 2; i++) {
			await (
				await uploadAndConfirm(context, { contentType: "image/png", bytes: PNG })
			).confirm();
		}
		const originalDelete = context.fake.storage.delete;
		let calls = 0;
		context.fake.storage.delete = async (key) => {
			if (++calls === 2) throw new Error("R2 down");
			return originalDelete(key);
		};
		await expectCode(
			context.service.removeTask({
				userId: "manager-a",
				businessId,
				taskId: context.current.id,
			}),
			"TASK_ATTACHMENT_STORAGE_FAILED",
		);
		expect(context.tasks.has(context.current.id)).toBe(true);
		expect(context.attachments).toHaveLength(2);
	});

	test("requires tasks.manage", async () => {
		const { service, current } = createContext();
		await expectCode(
			service.removeTask({ userId: "operator-a", businessId, taskId: current.id }),
			"BUSINESS_PERMISSION_DENIED",
		);
	});
});
