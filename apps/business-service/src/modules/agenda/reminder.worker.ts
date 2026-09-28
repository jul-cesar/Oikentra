export type DueReminder = {
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

export type ReminderWorkerRepository = {
	claimDueReminders(input: {
		now: Date;
		lockedUntil: Date;
		limit: number;
	}): Promise<DueReminder[]>;
	markReminderSent(input: { id: string; sentAt: Date }): Promise<void>;
	markReminderFailed(input: {
		id: string;
		error: string;
		failed: boolean;
		nextAttemptAt: Date;
		updatedAt: Date;
	}): Promise<void>;
};

export function createReminderWorker({
	repository,
	sendReminder,
	now = () => new Date(),
}: {
	repository: ReminderWorkerRepository;
	sendReminder: (reminder: DueReminder) => Promise<void>;
	now?: () => Date;
}) {
	return {
		async runBatch(limit = 50) {
			const startedAt = now();
			const reminders = await repository.claimDueReminders({
				now: startedAt,
				lockedUntil: new Date(startedAt.getTime() + 5 * 60_000),
				limit,
			});

			for (const reminder of reminders) {
				try {
					await sendReminder(reminder);
					await repository.markReminderSent({ id: reminder.id, sentAt: now() });
				} catch (cause) {
					const updatedAt = now();
					await repository.markReminderFailed({
						id: reminder.id,
						error: cause instanceof Error ? cause.message : "Unknown email error",
						failed: reminder.attempts >= 5,
						nextAttemptAt: new Date(
							updatedAt.getTime() +
								Math.min(2 ** (reminder.attempts - 1) * 60_000, 60 * 60_000),
						),
						updatedAt,
					});
				}
			}

			return reminders.length;
		},
	};
}
