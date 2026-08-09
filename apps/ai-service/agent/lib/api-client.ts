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

function maskId(value: string) {
	return value.length <= 8 ? "***" : `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function logBusinessApi(fields: {
	businessId: string;
	method: string;
	path: string;
	status: number;
	durationMs: number;
	requestId: string;
	errorCode?: string;
}) {
	const level =
		fields.status >= 500 ? "error" : fields.status >= 400 ? "warn" : "info";
	console[level](
		JSON.stringify({
			timestamp: new Date().toISOString(),
			level,
			service: "ai-business-api",
			...fields,
			businessId: maskId(fields.businessId),
		}),
	);
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

	const requestId = crypto.randomUUID();
	const startedAt = performance.now();
	const method = request.method ?? "GET";
	const headers = new Headers({
		Accept: "application/json",
		"X-Request-Id": requestId,
	});

	if (request.body !== undefined)
		headers.set("Content-Type", "application/json");

	const token = internalAuthHeader(context);
	if (token) headers.set("X-Internal-Auth", token);

	let response: Response;
	try {
		response = await fetch(url, {
			method,
			headers,
			body:
				request.body === undefined ? undefined : JSON.stringify(request.body),
			cache: "no-store",
			signal: request.signal,
		});
	} catch (error) {
		logBusinessApi({
			businessId: context.businessId,
			method,
			path,
			status: 503,
			durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
			requestId,
			errorCode: error instanceof Error ? error.name : "FETCH_ERROR",
		});
		throw error;
	}

	const envelope = (await response
		.json()
		.catch(() => null)) as ApiEnvelope<T> | null;

	logBusinessApi({
		businessId: context.businessId,
		method,
		path,
		status: response.status,
		durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
		requestId,
		errorCode: response.ok ? undefined : envelope?.code,
	});

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
