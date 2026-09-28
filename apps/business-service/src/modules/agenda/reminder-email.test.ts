import { describe, expect, test } from "bun:test";

import { createReminderEmailSender } from "./reminder-email";

describe("event reminder email", () => {
	test("escapes event content and uses a schedule-specific idempotency key", async () => {
		const sent: unknown[] = [];
		const sendReminder = createReminderEmailSender({
			from: "Oikentra <recordatorios@example.com>",
			client: {
				emails: {
					async send(input: unknown) {
						sent.push(input);
						return { data: { id: "email-a" }, error: null };
					},
				},
			},
		});

		await sendReminder({
			id: "reminder-a",
			eventId: "event-a",
			recipientEmail: "owner@example.com",
			title: "Pedido <urgente>",
			description: "Entregar & cobrar",
			startAt: new Date("2026-04-15T14:00:00.000Z"),
			scheduledAt: new Date("2026-04-15T13:00:00.000Z"),
			timeZone: "America/Bogota",
			attempts: 1,
		});

		expect(sent).toHaveLength(1);
		expect(sent[0]).toMatchObject({
			from: "Oikentra <recordatorios@example.com>",
			to: ["owner@example.com"],
			idempotencyKey:
				"event-reminder/reminder-a/2026-04-15T13:00:00.000Z",
		});
		expect((sent[0] as { html: string }).html).toContain(
			"Pedido &lt;urgente&gt;",
		);
		expect((sent[0] as { html: string }).html).toContain(
			"Entregar &amp; cobrar",
		);
	});
});
