function readRequiredEnv(
	name:
		| "DATABASE_URL"
		| "INTERNAL_AUTH_PUBLIC_KEY_B64"
		| "RESEND_API_KEY"
		| "REMINDER_EMAIL_FROM",
) {
	const value = process.env[name]?.trim();

	if (!value) {
		throw new Error(`${name} is required`);
	}

	return value;
}

export function getPort() {
	const rawPort = process.env.PORT?.trim();

	if (!rawPort) {
		return 3000;
	}

	const port = Number(rawPort);

	if (!Number.isInteger(port) || port <= 0 || port > 65535) {
		throw new Error("PORT must be a valid TCP port");
	}

	return port;
}

function readOptionalEnv(name: string) {
	const value = process.env[name]?.trim();
	return value || undefined;
}

export function getConfig() {
	const r2AccountId = readOptionalEnv("R2_ACCOUNT_ID");
	const r2Bucket = readOptionalEnv("R2_BUCKET");
	const r2AccessKeyId = readOptionalEnv("R2_ACCESS_KEY_ID");
	const r2SecretAccessKey = readOptionalEnv("R2_SECRET_ACCESS_KEY");
	const r2PublicBaseUrl = readOptionalEnv("R2_PUBLIC_BASE_URL");
	const r2PrivateBucket = readOptionalEnv("R2_PRIVATE_BUCKET");

	return {
		databaseUrl: readRequiredEnv("DATABASE_URL"),
		internalAuthPublicKeyBase64: readRequiredEnv(
			"INTERNAL_AUTH_PUBLIC_KEY_B64",
		),
		internalAuthAudience: "business-service",
		internalAuthDevBypass: {
			enabled:
				process.env.NODE_ENV === "development" &&
				process.env.INTERNAL_AUTH_DEV_BYPASS === "true",
			userId:
				process.env.INTERNAL_AUTH_DEV_USER_ID?.trim() || "local-test-user",
			sessionId: "local-test-session",
			email: process.env.INTERNAL_AUTH_DEV_USER_EMAIL?.trim() || undefined,
		},
		r2:
			r2AccountId &&
			r2Bucket &&
			r2AccessKeyId &&
			r2SecretAccessKey &&
			r2PublicBaseUrl
				? {
						accountId: r2AccountId,
						bucket: r2Bucket,
						accessKeyId: r2AccessKeyId,
						secretAccessKey: r2SecretAccessKey,
						publicBaseUrl: r2PublicBaseUrl.replace(/\/$/, ""),
					}
				: null,
		r2PrivateBucket:
			r2AccountId && r2PrivateBucket && r2AccessKeyId && r2SecretAccessKey
				? {
						accountId: r2AccountId,
						bucket: r2PrivateBucket,
						accessKeyId: r2AccessKeyId,
						secretAccessKey: r2SecretAccessKey,
					}
				: null,
		port: getPort(),
	};
}

export function getReminderWorkerConfig() {
	const rawPollInterval = readOptionalEnv("REMINDER_POLL_INTERVAL_MS");
	const pollIntervalMs = rawPollInterval ? Number(rawPollInterval) : 30_000;
	if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 1_000) {
		throw new Error("REMINDER_POLL_INTERVAL_MS must be an integer of at least 1000");
	}
	return {
		resendApiKey: readRequiredEnv("RESEND_API_KEY"),
		reminderEmailFrom: readRequiredEnv("REMINDER_EMAIL_FROM"),
		pollIntervalMs,
	};
}

export function validateRuntimeConfig() {
	getConfig();
}
