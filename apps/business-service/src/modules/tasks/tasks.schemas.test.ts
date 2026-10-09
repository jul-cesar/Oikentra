import { describe, expect, it } from "bun:test";

import {
	assignTaskSchema,
	createTaskSchema,
	taskFiltersSchema,
} from "./tasks.schemas";

// Member ids are text primary keys, not always UUIDs (e.g. 32-char hex).
const hexMemberId = "ee7411bf9f42caf522ab9ccba353ecf0";

describe("task member id validation", () => {
	it("accepts non-UUID member ids when creating, assigning and filtering", () => {
		expect(
			createTaskSchema.safeParse({
				title: "asda",
				priority: "MEDIUM",
				assigneeMemberId: hexMemberId,
				description: null,
				dueAt: null,
			}).success,
		).toBe(true);
		expect(
			assignTaskSchema.safeParse({ version: 1, assigneeMemberId: hexMemberId })
				.success,
		).toBe(true);
		expect(
			taskFiltersSchema.safeParse({ assigneeMemberId: hexMemberId }).success,
		).toBe(true);
	});

	it("still rejects an empty member id", () => {
		expect(
			createTaskSchema.safeParse({
				title: "asda",
				priority: "MEDIUM",
				assigneeMemberId: "",
			}).success,
		).toBe(false);
	});
});
