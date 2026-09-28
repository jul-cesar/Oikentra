import { Hono } from "hono";

import { validationError } from "../../http/errors";
import { requireAuthHeaders } from "../../http/middleware/require-auth-headers";
import type { AppBindings } from "../../http/request-context";
import { success } from "../../http/response";
import {
	agendaEventParamsSchema,
	agendaRangeSchema,
	createAgendaEventSchema,
	updateAgendaEventSchema,
} from "./agenda.schemas";
import { agendaService } from "./agenda.service";

export const agendaRoutes = new Hono<AppBindings>();

agendaRoutes.use("*", requireAuthHeaders);

agendaRoutes.get("/", async (c) => {
	const parsedQuery = agendaRangeSchema.safeParse(c.req.query());
	if (!parsedQuery.success) throw validationError(parsedQuery.error);

	return success(
		c,
		await agendaService.list({
			userId: c.get("auth").userId,
			businessId: c.req.param("businessId")!,
			range: parsedQuery.data,
		}),
	);
});

agendaRoutes.post("/", async (c) => {
	const parsedBody = createAgendaEventSchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsedBody.success) throw validationError(parsedBody.error);

	return success(
		c,
		await agendaService.create({
			userId: c.get("auth").userId,
			recipientEmail: c.get("auth").email,
			businessId: c.req.param("businessId")!,
			input: parsedBody.data,
		}),
		201,
	);
});

agendaRoutes.patch("/:eventId", async (c) => {
	const parsedParams = agendaEventParamsSchema.safeParse(c.req.param());
	if (!parsedParams.success) throw validationError(parsedParams.error);
	const parsedBody = updateAgendaEventSchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsedBody.success) throw validationError(parsedBody.error);

	return success(
		c,
		await agendaService.update({
			userId: c.get("auth").userId,
			recipientEmail: c.get("auth").email,
			businessId: parsedParams.data.businessId,
			eventId: parsedParams.data.eventId,
			input: parsedBody.data,
		}),
	);
});

agendaRoutes.delete("/:eventId", async (c) => {
	const parsedParams = agendaEventParamsSchema.safeParse(c.req.param());
	if (!parsedParams.success) throw validationError(parsedParams.error);

	return success(
		c,
		await agendaService.cancel({
			userId: c.get("auth").userId,
			businessId: parsedParams.data.businessId,
			eventId: parsedParams.data.eventId,
		}),
	);
});
