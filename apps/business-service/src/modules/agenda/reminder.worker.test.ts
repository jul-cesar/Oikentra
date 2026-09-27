import { describe, expect, test } from "bun:test";

const workerModule = await import("./reminder.worker").catch(() => null);

const dueReminder = {
	id: "reminder-a",
	eventId: "event-a",
	recipientEmail: "owner@example.com",
	title: "Llamar proveedor",
	description: null,
	startAt: new Date("2026-04-15T14:00:00.000Z"),
	scheduledAt: new Date("2026-04-15T13:00:00.000Z"),
	timeZone: "America/Bogota",
	attempts: 1,
};

function createRepository() {
	const sent: string[] = [];
	const failed: unknown[] = [];
	return {
		sent,
		failed,
		repository: {
			async claimDueReminders() {
				return [dueReminder];
			},
			async markReminderSent({ id }: { id: string }) {
				sent.push(id);
			},
			async markReminderFailed(input: unknown) {
				failed.push(input);
			},
		},
	};
}

describe("event reminder worker", () => {
	test("sends due reminders and marks them as sent", async () => {
		expect(workerModule).not.toBeNull();
		if (!workerModule) return;
		const { repository, sent } = createRepository();
		const delivered: string[] = [];
		const worker = workerModule.createReminderWorker({
			repository,
			now: () => new Date("2026-04-15T13:00:30.000Z"),
			sendReminder: async (reminder) => {
				delivered.push(reminder.id);
			},
		});

		await worker.runBatch();

		expect(delivered).toEqual(["reminder-a"]);
		expect(sent).toEqual(["reminder-a"]);
	});

	test("reschedules a failed delivery with backoff", async () => {
		expect(workerModule).not.toBeNull();
		if (!workerModule) return;
		const { repository, failed } = createRepository();
		const worker = workerModule.createReminderWorker({
			repository,
			now: () => new Date("2026-04-15T13:00:30.000Z"),
			sendReminder: async () => {
				throw new Error("Resend unavailable");
			},
		});

		await worker.runBatch();

		expect(failed).toEqual([
			{
				id: "reminder-a",
				error: "Resend unavailable",
				failed: false,
				nextAttemptAt: new Date("2026-04-15T13:01:30.000Z"),
				updatedAt: new Date("2026-04-15T13:00:30.000Z"),
			},
		]);
	});
});
