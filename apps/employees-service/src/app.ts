import { Hono } from "hono";
import {
	logError,
	requestIdMiddleware,
	requestLoggerMiddleware,
} from "@oikentra/http-logging";

import { checkDatabaseConnection } from "./db/health";
import { AppError } from "./http/errors";
import type { AppBindings } from "./http/request-context";
import { success } from "./http/response";

export const app = new Hono<AppBindings>();

app.use("*", requestIdMiddleware());
app.use("*", requestLoggerMiddleware("employees-service"));

app.get("/api/employees/health/live", (c) => {
	return success(c, { status: "ok", service: "employees-service" });
});

app.get("/api/employees/health/ready", async (c) => {
	try {
		await checkDatabaseConnection();
	} catch (error) {
		throw new AppError(
			"DEPENDENCY_UNAVAILABLE",
			503,
			"The database is unavailable.",
		);
	}

	return success(c, { status: "ready", service: "employees-service" });
});

app.onError((error, c) => {
	const requestId = c.get("requestId") ?? crypto.randomUUID();

	if (error instanceof AppError) {
		logError("employees-service", error, c, error.status);

		return c.json(
			{
				code: error.code,
				message: error.message,
				details: error.details,
				requestId,
			},
			error.status,
		);
	}

	console.error(error);

	return c.json(
		{
			code: "INTERNAL_SERVER_ERROR",
			message: "An internal error occurred.",
			details: error instanceof Error ? error.message : null,
			requestId,
		},
		500,
	);
});
