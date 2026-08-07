import { issueInternalAssertion } from "@oikentra/internal-auth";
import type { OikentraAgentContext } from "./agent-context";

type ApiEnvelope<T> = {
	data?: T;
	code?: string;
	message?: string;
	details?: unknown;
	requestId?: string;
};

type ApiRequest = {
	method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
	query?: Record<string, string | number | boolean | undefined>;
	body?: unknown;
	signal?: AbortSignal;
};

export class OikentraApiError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly status: number,
		public readonly requestId?: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "OikentraApiError";
	}
}

function businessBaseUrl() {
	const value =
		process.env.BUSINESS_BASE_URL?.trim() ?? "http://localhost:3000";
	return value.endsWith("/") ? value : `${value}/`;
}

function normalizePrivateKeyBase64(value: string) {
	const normalized = value.trim().replace(/\\n/g, "\n");

	if (normalized.startsWith("-----BEGIN ")) {
		return Buffer.from(normalized, "utf8").toString("base64");
	}

	return normalized;
}

async function internalAuthHeader(context: OikentraAgentContext) {
	const configuredPrivateKey =
		process.env.OIKENTRA_INTERNAL_AUTH_PRIVATE_KEY_B64?.trim() ??
		process.env.INTERNAL_AUTH_PRIVATE_KEY_B64?.trim();

	if (!configuredPrivateKey) return undefined;

	try {
		const token = await issueInternalAssertion({
			privateKeyBase64: normalizePrivateKeyBase64(configuredPrivateKey),
			userId: context.userId,
			sessionId: context.sessionId,
			audience: "business-service",
		});

		return token;
	} catch (error) {
		throw new Error(
			`Internal auth private key is invalid. Set OIKENTRA_INTERNAL_AUTH_PRIVATE_KEY_B64 or INTERNAL_AUTH_PRIVATE_KEY_B64 to a base64-encoded PKCS#8 PEM private key (-----BEGIN PRIVATE KEY-----), not a public key or RSA PRIVATE KEY. ${
				error instanceof Error ? error.message : ""
			}`,
		);
	}
}

export async function businessApi<T>(
	context: OikentraAgentContext,
	path: string,
	request: ApiRequest = {},
): Promise<T> {
	const url = new URL(path.replace(/^\//, ""), businessBaseUrl());

	for (const [key, value] of Object.entries(request.query ?? {})) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}

	const headers = new Headers({
		Accept: "application/json",
		"X-Request-Id": crypto.randomUUID(),
	});

	if (request.body !== undefined)
		headers.set("Content-Type", "application/json");

	const token = await internalAuthHeader(context);
	if (token) headers.set("X-Internal-Auth", token);

	const response = await fetch(url, {
		method: request.method ?? "GET",
		headers,
		body: request.body === undefined ? undefined : JSON.stringify(request.body),
		cache: "no-store",
		signal: request.signal,
	});

	const envelope = (await response
		.json()
		.catch(() => null)) as ApiEnvelope<T> | null;

	if (!response.ok || !envelope || envelope.data === undefined) {
		throw new OikentraApiError(
			envelope?.message ?? "No pudimos consultar Oikentra.",
			envelope?.code ?? "OIKENTRA_API_ERROR",
			response.status,
			envelope?.requestId,
			envelope?.details,
		);
	}

	return envelope.data;
}

export function businessPath(context: OikentraAgentContext, suffix: string) {
	return `/api/business/businesses/${encodeURIComponent(context.businessId)}${suffix}`;
}
