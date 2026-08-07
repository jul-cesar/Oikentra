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

function internalAuthHeader(context: OikentraAgentContext) {
	return context.internalAuthToken;
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

	const token = internalAuthHeader(context);
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
