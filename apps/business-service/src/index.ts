import { app } from "./app";
import { getPort, validateRuntimeConfig } from "./config/config";
import { runReminderWorker } from "./reminder-worker";

if (import.meta.main) {
	validateRuntimeConfig();
	void runReminderWorker().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}

export default {
	port: getPort(),
	fetch: app.fetch,
};
