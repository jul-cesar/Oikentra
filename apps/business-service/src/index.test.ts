import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

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
