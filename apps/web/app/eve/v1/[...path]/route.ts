export const dynamic = "force-dynamic";
export const revalidate = 0;

// Headers de transporte/compresión que no deben reenviarse al cliente.
// Cloudflare puede responder con Brotli (`content-encoding: br`); si Node.js
// descomprime el body y el proxy reenvía ese header, el navegador falla con
// `ERR_CONTENT_DECODING_FAILED`.
const HOP_BY_HOP_HEADERS = new Set([
	"connection",
	"content-encoding",
	"content-length",
	"keep-alive",
	"transfer-encoding",
]);

// Headers que sí se reenvían al auth-service para validar sesión. No incluimos
// `accept-encoding`, `host` ni `content-length`.
const AUTH_REQUEST_HEADERS = [
	"accept",
	"authorization",
	"cookie",
	"origin",
	"referer",
	"user-agent",
	"x-device-id",
	"x-request-id",
	"x-client-version",
] as const;

// Headers que sí se reenvían al AI service. No incluimos `accept-encoding`,
// `host` ni `content-length`.
const AI_REQUEST_HEADERS = [
	"accept",
	"content-type",
	"x-request-id",
	"x-oikentra-business-id",
] as const;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function json(body: object, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/json",
		},
	});
}

function requestId(request: Request) {
	const candidate = request.headers.get("x-request-id")?.trim();
	return candidate &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			candidate,
		)
		? candidate
		: crypto.randomUUID();
}

function stableHash(value: string) {
	let hash = 0x811c9dc5;
	for (let index = 0; index < value.length; index++) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(36);
}

function maskValue(value: string | null | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) return undefined;
	return `${trimmed.slice(0, 4)}…${stableHash(trimmed).slice(-6)}`;
}

function requestIp(request: Request) {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip")?.trim() ||
		"unknown"
	);
}

function rateLimitKey(request: Request) {
	const cookie = request.headers.get("cookie")?.trim();
	if (cookie) return `cookie:${stableHash(cookie)}`;

	const businessId = request.headers.get("x-oikentra-business-id")?.trim();
	if (businessId) return `business:${businessId}`;

	return `ip:${requestIp(request)}`;
}

function pruneExpiredRateLimitBuckets(now: number) {
	for (const [bucketKey, bucket] of rateLimitBuckets) {
		if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
	}
}

function checkRateLimit(key: string) {
	const now = Date.now();
	const existing = rateLimitBuckets.get(key);
	if (!existing || existing.resetAt <= now) {
		if (rateLimitBuckets.size > 1_000) pruneExpiredRateLimitBuckets(now);
		rateLimitBuckets.set(key, {
			count: 1,
			resetAt: now + RATE_LIMIT_WINDOW_MS,
		});
		return { allowed: true };
	}

	if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
		return { allowed: false };
	}

	existing.count += 1;
	return { allowed: true };
}

function readRequiredUrl(name: "AUTH_BASE_URL" | "AI_BASE_URL") {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is required`);

	try {
		const url = new URL(value);
		if (!/^https?:$/.test(url.protocol))
			throw new Error("unsupported protocol");
		return url;
	} catch {
		throw new Error(`${name} must be a valid http(s) URL`);
	}
}

function authServiceBaseUrl() {
	const url = readRequiredUrl("AUTH_BASE_URL");
	// Web AUTH_BASE_URL commonly points at /api/auth for the Better Auth proxy;
	// the internal validation endpoint lives at the auth-service root.
	url.pathname = url.pathname.replace(/\/api\/auth\/?$/, "/");
	url.search = "";
	url.hash = "";
	return url;
}

function eveUpstreamUrl(path: string[], request: Request) {
	const baseUrl = readRequiredUrl("AI_BASE_URL");
	const url = new URL(
		`eve/v1/${path.map(encodeURIComponent).join("/")}`,
		`${baseUrl.toString().replace(/\/$/, "")}/`,
	);
	try {
		url.search = new URL(request.url).search;
	} catch {
		url.search = "";
	}
	return url;
}

function logProxy(fields: {
	requestId: string;
	method: string;
	path: string;
	status: number;
	durationMs: number;
	businessId?: string;
	upstreamStatus?: number;
	errorCategory?: string;
	rateLimitKey?: string;
}) {
	const level =
		fields.status >= 500 ? "error" : fields.status >= 400 ? "warn" : "info";
	console[level](
		JSON.stringify({
			timestamp: new Date().toISOString(),
			level,
			service: "web-ai-proxy",
			...fields,
		}),
	);
}

async function validateSession(request: Request, id: string) {
	const headers = new Headers();
	for (const name of AUTH_REQUEST_HEADERS) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}
	headers.set("x-request-id", id);

	const url = new URL("/internal/session/validate", authServiceBaseUrl());
	const response = await fetch(url, {
		method: "GET",
		headers,
		cache: "no-store",
		redirect: "manual",
		signal: AbortSignal.timeout(15_000),
	});

	if (response.status === 401 || response.status === 403) return null;
	if (!response.ok) throw new Error(`Auth service returned ${response.status}`);

	return response.headers.get("x-internal-auth")?.trim() || null;
}

async function proxy(request: Request, path: string[]) {
	const startedAt = Date.now();
	const id = requestId(request);
	const safePath = `/eve/v1/${path.map((segment) => encodeURIComponent(segment)).join("/")}`;
	const businessId = request.headers.get("x-oikentra-business-id")?.trim();
	const key = rateLimitKey(request);
	const limit = checkRateLimit(key);

	if (!limit.allowed) {
		logProxy({
			requestId: id,
			method: request.method,
			path: safePath,
			status: 429,
			durationMs: Date.now() - startedAt,
			businessId: maskValue(businessId),
			errorCategory: "RATE_LIMITED",
			rateLimitKey: maskValue(key),
		});
		return json(
			{
				code: "RATE_LIMITED",
				message:
					"Has hecho muchas consultas seguidas. Intenta de nuevo en un momento.",
				requestId: id,
			},
			429,
		);
	}

	let internalAuth: string | null;
	try {
		internalAuth = await validateSession(request, id);
	} catch {
		logProxy({
			requestId: id,
			method: request.method,
			path: safePath,
			status: 503,
			durationMs: Date.now() - startedAt,
			businessId: maskValue(businessId),
			errorCategory: "AUTH_SERVICE_UNAVAILABLE",
			rateLimitKey: maskValue(key),
		});
		return json({ code: "SERVICE_UNAVAILABLE", requestId: id }, 503);
	}

	if (!internalAuth) {
		logProxy({
			requestId: id,
			method: request.method,
			path: safePath,
			status: 401,
			durationMs: Date.now() - startedAt,
			businessId: maskValue(businessId),
			errorCategory: "UNAUTHENTICATED",
			rateLimitKey: maskValue(key),
		});
		return json({ code: "UNAUTHENTICATED", requestId: id }, 401);
	}

	const headers = new Headers();
	for (const name of AI_REQUEST_HEADERS) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}
	headers.set("x-request-id", id);
	headers.set("x-internal-auth", internalAuth);

	const hasBody = !["GET", "HEAD", "OPTIONS"].includes(request.method);

	try {
		const upstream = await fetch(eveUpstreamUrl(path, request), {
			method: request.method,
			headers,
			body: hasBody ? await request.arrayBuffer() : undefined,
			cache: "no-store",
			redirect: "manual",
		});

		const responseHeaders = new Headers();
		for (const [name, value] of upstream.headers) {
			if (!HOP_BY_HOP_HEADERS.has(name)) responseHeaders.append(name, value);
		}
		responseHeaders.set("Cache-Control", "no-store");

		logProxy({
			requestId: id,
			method: request.method,
			path: safePath,
			status: upstream.status,
			durationMs: Date.now() - startedAt,
			businessId: maskValue(businessId),
			upstreamStatus: upstream.status,
			errorCategory:
				upstream.status >= 500 ? "UPSTREAM_SERVER_ERROR" : undefined,
			rateLimitKey: maskValue(key),
		});

		return new Response(upstream.body, {
			status: upstream.status,
			statusText: upstream.statusText,
			headers: responseHeaders,
		});
	} catch {
		logProxy({
			requestId: id,
			method: request.method,
			path: safePath,
			status: 503,
			durationMs: Date.now() - startedAt,
			businessId: maskValue(businessId),
			errorCategory: "AI_SERVICE_UNAVAILABLE",
			rateLimitKey: maskValue(key),
		});
		return json({ code: "SERVICE_UNAVAILABLE", requestId: id }, 503);
	}
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: RouteContext) {
	return proxy(request, (await context.params).path);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
export const OPTIONS = handle;
