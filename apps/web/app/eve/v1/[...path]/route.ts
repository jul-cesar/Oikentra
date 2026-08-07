export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOP_BY_HOP_HEADERS = new Set([
	"connection",
	"content-length",
	"keep-alive",
	"transfer-encoding",
]);

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

const AI_REQUEST_HEADERS = [
	"accept",
	"content-type",
	"x-request-id",
	"x-oikentra-business-id",
] as const;

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
	upstreamStatus?: number;
	errorCategory?: string;
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
	const id = requestId(request);
	const safePath = `/eve/v1/${path.map((segment) => encodeURIComponent(segment)).join("/")}`;

	let internalAuth: string | null;
	try {
		internalAuth = await validateSession(request, id);
	} catch {
		logProxy({
			requestId: id,
			method: request.method,
			path: safePath,
			status: 503,
			errorCategory: "AUTH_SERVICE_UNAVAILABLE",
		});
		return json({ code: "SERVICE_UNAVAILABLE", requestId: id }, 503);
	}

	if (!internalAuth) {
		logProxy({
			requestId: id,
			method: request.method,
			path: safePath,
			status: 401,
			errorCategory: "UNAUTHENTICATED",
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
			upstreamStatus: upstream.status,
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
			errorCategory: "AI_SERVICE_UNAVAILABLE",
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
