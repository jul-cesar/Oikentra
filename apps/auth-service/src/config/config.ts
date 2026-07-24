const requiredEnvVars = [
	"DATABASE_URL",
	"BETTER_AUTH_SECRET",
	"BETTER_AUTH_URL",
	"GOOGLE_CLIENT_ID",
	"GOOGLE_CLIENT_SECRET",
	"RESEND_API_KEY",
	"AUTH_EMAIL_FROM",
	"WEB_URL",
	"INTERNAL_AUTH_PRIVATE_KEY_B64",
] as const;

function readRequiredEnv(name: (typeof requiredEnvVars)[number]) {
	const value = process.env[name]?.trim();

	if (!value) {
		throw new Error(`${name} is required`);
	}

	return value;
}

function readOptionalEnv(name: string) {
	return process.env[name]?.trim();
}

function readCookieDomain() {
	const value = readOptionalEnv("AUTH_COOKIE_DOMAIN");

	if (!value) return undefined;

	const domain = value.startsWith(".") ? value.slice(1) : value;
	const isValidDomain =
		domain.length <= 253 &&
		domain
			.split(".")
			.every(
				(label) =>
					label.length > 0 &&
					label.length <= 63 &&
					/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
			);

	if (!isValidDomain) {
		throw new Error("AUTH_COOKIE_DOMAIN must be a valid cookie domain");
	}

	return value;
}

function readUrl(name: "BETTER_AUTH_URL" | "WEB_URL") {
	const value = readRequiredEnv(name);

	try {
		new URL(value);
	} catch {
		throw new Error(`${name} must be a valid URL`);
	}

	return value;
}

export function getConfig() {
	return {
		authEmailFrom: readRequiredEnv("AUTH_EMAIL_FROM"),
		authCookieDomain: readCookieDomain(),
		betterAuthSecret: readRequiredEnv("BETTER_AUTH_SECRET"),
		betterAuthUrl: readUrl("BETTER_AUTH_URL"),
		databaseUrl: readRequiredEnv("DATABASE_URL"),
		internalAuthPrivateKeyBase64: readRequiredEnv(
			"INTERNAL_AUTH_PRIVATE_KEY_B64",
		),
		internalAuthAudience: [
			"business-service",
			"sync-service",
			"reports-service",
			"employees-service",
		],
		googleClientId: readRequiredEnv("GOOGLE_CLIENT_ID"),
		googleClientSecret: readRequiredEnv("GOOGLE_CLIENT_SECRET"),
		googleIosClientId: readOptionalEnv("GOOGLE_IOS_CLIENT_ID"),
		googleAndroidClientId: readOptionalEnv("GOOGLE_ANDROID_CLIENT_ID"),
		resendApiKey: readRequiredEnv("RESEND_API_KEY"),
		webUrl: readUrl("WEB_URL"),
	};
}

export function validateRuntimeConfig() {
	getConfig();
}
