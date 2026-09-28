import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import { z } from "zod";
import type { RequestLogEnv } from "@oikentra/http-logging";
import {
	logError,
	requestIdMiddleware,
	requestLoggerMiddleware,
} from "@oikentra/http-logging";
import { issueInternalAssertion } from "@oikentra/internal-auth";

import { getAuth } from "./auth";
import { checkDatabaseConnection, getDb } from "./db/client";
import { user } from "./db/schema";
import { getConfig, validateRuntimeConfig } from "./config/config";
import { profileRoutes } from "./modules/profile/profile.routes";
import { usersRoutes } from "./modules/users/users.routes";

const app = new Hono<RequestLogEnv>();
app.use("*", requestIdMiddleware());
app.use("*", requestLoggerMiddleware("auth-service"));
app.use("/api/auth/*", async (c, next) => {
	return cors({
		origin: getConfig().webUrl,
		allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
		allowMethods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
		credentials: true,
		maxAge: 600,
	})(c, next);
});

const signUpStatusSchema = z.object({
	email: z.email(),
});

type SignUpStatus = "available" | "unverified" | "verified";

function liveResponse(c: Context) {
	return c.json({ status: "ok", service: "auth-service" });
}

async function readyResponse(c: Context) {
	try {
		await checkDatabaseConnection();

		return c.json({ status: "ready", service: "auth-service" });
	} catch {
		return c.json({ status: "not_ready", service: "auth-service" }, 503);
	}
}

app.get("/", (c) => {
	return c.text("Oikentra auth service");
});

app.get("/api/auth/health/live", liveResponse);

app.get("/internal/session/validate", async (c) => {
	const headers = new Headers(c.req.raw.headers);
	headers.set("X-Request-Id", c.get("requestId"));
	const session = await getAuth().api.getSession({
		headers,
	});

	if (!session) {
		return c.json(
			{
				code: "UNAUTHENTICATED",
				message: "The session is not valid.",
			},
			401,
		);
	}

	c.header(
		"X-Internal-Auth",
		await issueInternalAssertion({
			privateKeyBase64: getConfig().internalAuthPrivateKeyBase64,
			userId: session.user.id,
			sessionId: session.session.id,
			email: session.user.email,
			audience: getConfig().internalAuthAudience,
			ttlSeconds: getConfig().internalAuthTokenTtlSeconds,
		}),
	);

	return c.body(null, 204);
});

app.route("/api/auth/profile", profileRoutes);
app.route("/api/auth/users", usersRoutes);

app.post("/api/auth/sign-up/status", async (c) => {
	let requestBody: unknown = null;
	try {
		requestBody = await c.req.json();
	} catch {
		requestBody = null;
	}
	const body = signUpStatusSchema.safeParse(requestBody);
	if (!body.success) {
		return c.json(
			{
				code: "INVALID_EMAIL",
				message: "A valid email is required.",
				requestId: c.get("requestId"),
			},
			400,
		);
	}

	const normalizedEmail = body.data.email.toLowerCase();
	const existingUser = await getDb()
		.select({ emailVerified: user.emailVerified })
		.from(user)
		.where(sql`lower(${user.email}) = ${normalizedEmail}`)
		.limit(1);

	let status: SignUpStatus = "available";
	if (existingUser[0]?.emailVerified) {
		status = "verified";
	} else if (existingUser.length > 0) {
		status = "unverified";
	}

	return c.json({ status, requestId: c.get("requestId") });
});

app.on(["GET", "POST"], "/api/auth/*", (c) => {
	const headers = new Headers(c.req.raw.headers);
	headers.set("X-Request-Id", c.get("requestId"));
	return getAuth().handler(new Request(c.req.raw, { headers }));
});

app.onError((error, c) => {
	logError("auth-service", error, c, 500);
	return c.json(
		{ code: "INTERNAL_SERVER_ERROR", message: "An internal error occurred." },
		500,
	);
});

if (import.meta.main) validateRuntimeConfig();

export default {
	port: Number(process.env.PORT ?? 3000),
	fetch: app.fetch,
};
