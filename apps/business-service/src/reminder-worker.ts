import { Resend } from "resend";

import { getReminderWorkerConfig, validateRuntimeConfig } from "./config/config";
import { getDatabaseClient } from "./db/client";
import { agendaRepository } from "./modules/agenda/agenda.repository";
import { createReminderEmailSender } from "./modules/agenda/reminder-email";
import { createReminderWorker } from "./modules/agenda/reminder.worker";

function wait(milliseconds: number) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function runReminderWorker() {
	validateRuntimeConfig();
	const config = getReminderWorkerConfig();
	const worker = createReminderWorker({
		repository: agendaRepository,
		sendReminder: createReminderEmailSender({
			client: new Resend(config.resendApiKey),
			from: config.reminderEmailFrom,
		}),
	});
	let stopping = false;
	const stop = () => {
		stopping = true;
	};
	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);

	try {
		while (!stopping) {
			try {
				const processed = await worker.runBatch();
				if (processed) {
					console.info(
						JSON.stringify({
							timestamp: new Date().toISOString(),
							level: "info",
							service: "business-reminder-worker",
							processed,
						}),
					);
				}
			} catch (error) {
				console.error(
					JSON.stringify({
						timestamp: new Date().toISOString(),
						level: "error",
						service: "business-reminder-worker",
						error: error instanceof Error ? error.message : String(error),
					}),
				);
			}
			if (!stopping) await wait(config.pollIntervalMs);
		}
	} finally {
		await getDatabaseClient().end();
	}
}

if (import.meta.main) await runReminderWorker();
