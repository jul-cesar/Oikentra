type ReminderEmail = {
	id: string;
	eventId: string;
	recipientEmail: string;
	title: string;
	description: string | null;
	startAt: Date;
	scheduledAt: Date;
	timeZone: string;
	attempts: number;
};

type EmailClient = {
	emails: {
		send(input: {
			from: string;
			to: string[];
			subject: string;
			html: string;
			idempotencyKey: string;
		}): Promise<{ data: unknown; error: { message: string } | null }>;
	};
};

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

export function createReminderEmailSender({
	client,
	from,
}: {
	client: EmailClient;
	from: string;
}) {
	return async (reminder: ReminderEmail) => {
		const startsAt = new Intl.DateTimeFormat("es-CO", {
			dateStyle: "full",
			timeStyle: "short",
			timeZone: reminder.timeZone,
		}).format(reminder.startAt);
		const description = reminder.description
			? `<p>${escapeHtml(reminder.description)}</p>`
			: "";
		const { data, error } = await client.emails.send({
			from,
			to: [reminder.recipientEmail],
			subject: `Recordatorio: ${reminder.title}`,
			html: `<h1>${escapeHtml(reminder.title)}</h1><p>${escapeHtml(startsAt)}</p>${description}`,
			idempotencyKey: `event-reminder/${reminder.id}/${reminder.scheduledAt.toISOString()}`,
		});

		if (error) throw new Error(`Failed to send reminder email: ${error.message}`);
		if (!data) throw new Error("Failed to send reminder email: Resend returned no data");
	};
}
