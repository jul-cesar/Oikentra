import { Hono } from "hono";

import { AppError, validationError } from "../../http/errors";
import { requireAuthHeaders } from "../../http/middleware/require-auth-headers";
import type { AppBindings } from "../../http/request-context";
import { success } from "../../http/response";
import { dashboardSummaryQuerySchema } from "./dashboard-summary.schemas";
import { dashboardSummaryService } from "./dashboard-summary.service";

export const dashboardSummaryRoutes = new Hono<AppBindings>();

dashboardSummaryRoutes.use("*", requireAuthHeaders);

dashboardSummaryRoutes.get("/", async (c) => {
	const parsedQuery = dashboardSummaryQuerySchema.safeParse(c.req.query());

	if (!parsedQuery.success) {
		throw validationError(parsedQuery.error);
	}

	const businessId = c.req.param("businessId");
	if (!businessId) {
		throw new AppError("VALIDATION_ERROR", 400, "The business id is required.");
	}

	const summary = await dashboardSummaryService.get(
		c.get("auth").userId,
		businessId,
		parsedQuery.data,
	);

	return success(c, summary);
});
