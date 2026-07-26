export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "transfer-encoding",
]);

const REQUEST_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "cookie",
  "origin",
  "referer",
  "user-agent",
  "x-request-id",
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

function getUpstreamUrl(
  baseUrl: URL,
  path: string[],
  request: Request,
) {
  const url = new URL(
    path.map(encodeURIComponent).join("/"),
    `${baseUrl.toString().replace(/\/$/, "")}/`,
  );
  url.search = new URL(request.url).search;
  return url;
}

function logProxy(fields: {
  requestId: string;
  method: string;
  path: string;
  status: number;
  errorCategory?: string;
}) {
  const level =
    fields.status >= 500 ? "error" : fields.status >= 400 ? "warn" : "info";
  console[level](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "web-reports-proxy",
      ...fields,
    }),
  );
}

async function proxy(request: Request, path: string[]) {
  const id = requestId(request);
  const safePath = `/api/reports/${path.map((segment) => encodeURIComponent(segment)).join("/")}`;
  const configuredBaseUrl = process.env.REPORTS_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    logProxy({
      requestId: id,
      method: request.method,
      path: safePath,
      status: 503,
      errorCategory: "REPORTS_BASE_URL_MISSING",
    });
    return json({ code: "SERVICE_UNAVAILABLE", requestId: id }, 503);
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(configuredBaseUrl);
    if (!/^https?:$/.test(baseUrl.protocol)) throw new Error("Unsupported protocol");
  } catch {
    logProxy({
      requestId: id,
      method: request.method,
      path: safePath,
      status: 503,
      errorCategory: "REPORTS_BASE_URL_INVALID",
    });
    return json({ code: "SERVICE_UNAVAILABLE", requestId: id }, 503);
  }

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-request-id", id);

  try {
    const upstream = await fetch(getUpstreamUrl(baseUrl, path, request), {
      method: request.method,
      headers,
      body:
        request.method === "GET" ||
        request.method === "HEAD" ||
        request.method === "OPTIONS"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });

    if (upstream.status >= 500) {
      logProxy({
        requestId: id,
        method: request.method,
        path: safePath,
        status: upstream.status,
        errorCategory: "UPSTREAM_SERVER_ERROR",
      });
      return json({ code: "UPSTREAM_ERROR", requestId: id }, upstream.status);
    }

    const responseHeaders = new Headers();
    for (const [name, value] of upstream.headers) {
      if (!HOP_BY_HOP_HEADERS.has(name)) {
        responseHeaders.append(name, value);
      }
    }
    responseHeaders.set("Cache-Control", "no-store");

    logProxy({
      requestId: id,
      method: request.method,
      path: safePath,
      status: upstream.status,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    logProxy({
      requestId: id,
      method: request.method,
      path: safePath,
      status: 503,
      errorCategory:
        error instanceof Error && error.name === "TimeoutError"
          ? "UPSTREAM_TIMEOUT"
          : "UPSTREAM_FETCH_FAILURE",
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
