import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";

import { validationError } from "../../http/errors";
import { requireAuthHeaders } from "../../http/middleware/require-auth-headers";
import type { AppBindings } from "../../http/request-context";
import { success } from "../../http/response";
import { taskCollaborationService } from "./task-collaboration.service";
import {
	assignTaskSchema,
	changeTaskStatusSchema,
	createTaskCommentSchema,
	createTaskSchema,
	taskFiltersSchema,
	updateTaskSchema,
} from "./tasks.schemas";
import { tasksService } from "./tasks.service";

const taskParamsSchema = z.object({
	businessId: z.string().min(1),
	taskId: z.string().uuid(),
});
const attachmentParamsSchema = taskParamsSchema.extend({
	attachmentId: z.string().uuid(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success) throw validationError(result.error);
	return result.data;
}

const readBody = (c: Context<AppBindings>) => c.req.json().catch(() => null);

// Query strings carry booleans as text; anything else is left for zod to reject.
const queryBoolean = (value: string | undefined) =>
	value === "true" ? true : value === "false" ? false : value;

export const tasksRoutes = new Hono<AppBindings>();

tasksRoutes.use("*", requireAuthHeaders);

tasksRoutes.get("/", async (c) => {
	const query = c.req.query();
	const filters = parse(taskFiltersSchema, {
		...query,
		mine: queryBoolean(query.mine),
		unassigned: queryBoolean(query.unassigned),
	});

	return success(
		c,
		await tasksService.list({
			userId: c.get("auth").userId,
			businessId: c.req.param("businessId")!,
			filters,
		}),
	);
});

tasksRoutes.post("/", async (c) => {
	const input = parse(createTaskSchema, await readBody(c));

	return success(
		c,
		await tasksService.create({
			userId: c.get("auth").userId,
			businessId: c.req.param("businessId")!,
			input,
		}),
		201,
	);
});

tasksRoutes.get("/:taskId", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());

	return success(
		c,
		await tasksService.get({ userId: c.get("auth").userId, businessId, taskId }),
	);
});

tasksRoutes.patch("/:taskId", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());
	const input = parse(updateTaskSchema, await readBody(c));

	return success(
		c,
		await tasksService.update({
			userId: c.get("auth").userId,
			businessId,
			taskId,
			input,
		}),
	);
});

tasksRoutes.delete("/:taskId", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());
	await taskCollaborationService.removeTask({
		userId: c.get("auth").userId,
		businessId,
		taskId,
	});

	return success(c, { id: taskId });
});

tasksRoutes.post("/:taskId/status", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());
	const input = parse(changeTaskStatusSchema, await readBody(c));

	return success(
		c,
		await tasksService.changeStatus({
			userId: c.get("auth").userId,
			businessId,
			taskId,
			input,
		}),
	);
});

tasksRoutes.post("/:taskId/assignee", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());
	const input = parse(assignTaskSchema, await readBody(c));

	return success(
		c,
		await tasksService.assign({
			userId: c.get("auth").userId,
			businessId,
			taskId,
			input,
		}),
	);
});

tasksRoutes.get("/:taskId/comments", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());

	return success(
		c,
		await taskCollaborationService.listComments({
			userId: c.get("auth").userId,
			businessId,
			taskId,
		}),
	);
});

tasksRoutes.post("/:taskId/comments", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());
	const input = parse(createTaskCommentSchema, await readBody(c));

	return success(
		c,
		await taskCollaborationService.createComment({
			userId: c.get("auth").userId,
			businessId,
			taskId,
			input,
		}),
		201,
	);
});

tasksRoutes.get("/:taskId/attachments", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());

	return success(
		c,
		await taskCollaborationService.listAttachments({
			userId: c.get("auth").userId,
			businessId,
			taskId,
		}),
	);
});

// The collaboration service validates upload and confirm bodies itself.
tasksRoutes.post("/:taskId/attachments/upload", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());

	return success(
		c,
		await taskCollaborationService.requestAttachmentUpload({
			userId: c.get("auth").userId,
			businessId,
			taskId,
			input: await readBody(c),
		}),
	);
});

tasksRoutes.post("/:taskId/attachments/confirm", async (c) => {
	const { businessId, taskId } = parse(taskParamsSchema, c.req.param());

	return success(
		c,
		await taskCollaborationService.confirmAttachmentUpload({
			userId: c.get("auth").userId,
			businessId,
			taskId,
			input: await readBody(c),
		}),
		201,
	);
});

tasksRoutes.get("/:taskId/attachments/:attachmentId/download", async (c) => {
	const { businessId, taskId, attachmentId } = parse(
		attachmentParamsSchema,
		c.req.param(),
	);

	return success(
		c,
		await taskCollaborationService.getAttachmentDownload({
			userId: c.get("auth").userId,
			businessId,
			taskId,
			attachmentId,
		}),
	);
});

tasksRoutes.delete("/:taskId/attachments/:attachmentId", async (c) => {
	const { businessId, taskId, attachmentId } = parse(
		attachmentParamsSchema,
		c.req.param(),
	);
	await taskCollaborationService.deleteAttachment({
		userId: c.get("auth").userId,
		businessId,
		taskId,
		attachmentId,
	});

	return success(c, { id: attachmentId });
});
