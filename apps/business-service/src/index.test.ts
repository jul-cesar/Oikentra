import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { app } from "./app";

const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts: { dev: string } };

describe("business service entrypoint", () => {
	test("starts the reminder worker with the HTTP service", () => {
		expect(source).toContain('import { runReminderWorker } from "./reminder-worker"');
		expect(source).toMatch(
			/if \(import\.meta\.main\)[\s\S]*void runReminderWorker\(\)/,
		);
	});

	test("uses hard process restarts instead of Bun hot reload", () => {
		expect(packageJson.scripts.dev).toBe("bun run --watch src/index.ts");
	});
});

describe("task routes", () => {
	const base = "/api/business/businesses/biz-1/tasks";
	const id = "11111111-1111-4111-8111-111111111111";
	const routes: [string, string][] = [
		["GET", ""],
		["POST", ""],
		["GET", `/${id}`],
		["PATCH", `/${id}`],
		["DELETE", `/${id}`],
		["POST", `/${id}/status`],
		["POST", `/${id}/assignee`],
		["GET", `/${id}/comments`],
		["POST", `/${id}/comments`],
		["GET", `/${id}/attachments`],
		["POST", `/${id}/attachments/upload`],
		["POST", `/${id}/attachments/confirm`],
		["GET", `/${id}/attachments/${id}/download`],
		["DELETE", `/${id}/attachments/${id}`],
	];
	const env = {
		DATABASE_URL: "postgres://localhost/test",
		INTERNAL_AUTH_PUBLIC_KEY_B64: "test-key",
		NODE_ENV: "production",
		INTERNAL_AUTH_DEV_BYPASS: "false",
	};
	const originalEnv = Object.fromEntries(
		Object.keys(env).map((name) => [name, process.env[name]]),
	);
	beforeAll(() => {
		Object.assign(process.env, env);
	});
	afterAll(() => {
		for (const [name, value] of Object.entries(originalEnv)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});

	test.each(routes)("%s %s requires internal authentication", async (method, path) => {
		const response = await app.request(`${base}${path}`, { method });

		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
	});

	test("rejects invalid filters with the standard error envelope", async () => {
		Object.assign(process.env, { NODE_ENV: "development", INTERNAL_AUTH_DEV_BYPASS: "true" });
		const response = await app.request(`${base}?status=ARCHIVED`);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
	});

	test("rejects a malformed task id before reaching the service", async () => {
		Object.assign(process.env, { NODE_ENV: "development", INTERNAL_AUTH_DEV_BYPASS: "true" });
		const response = await app.request(`${base}/not-a-uuid`);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
	});
});
