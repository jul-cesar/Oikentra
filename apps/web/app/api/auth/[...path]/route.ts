export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
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
  "x-device-id",
  "x-request-id",
  "x-client-version",
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
  return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : crypto.randomUUID();
}

function logProxy(fields: {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  targetAvailability: "configured" | "missing" | "invalid";
  upstreamStatus?: number;
  errorCategory?: string;
}) {
  const level = fields.status >= 500 ? "error" : fields.status >= 400 ? "warn" : "info";
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "web-auth-proxy",
    ...fields,
  }));
}

function getSetCookies(headers: Headers) {
  const getSetCookie = (
    headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;

  if (getSetCookie) {
    return getSetCookie.call(headers);
  }

  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function makeWebCookie(cookie: string) {
  // The upstream host must never become the browser cookie's domain.
  return cookie.replace(/;\s*Domain=[^;]*/gi, "");
}

function getUpstreamUrl(baseUrl: string, path: string[], request: Request) {
  const url = new URL(path.map(encodeURIComponent).join("/"), `${baseUrl}/`);
  try {
    url.search = new URL(request.url).search;
  } catch {
    // Invalid request URL; leave query string empty.
  }
  return url;
}

async function proxy(request: Request, path: string[]) {
  const startedAt = performance.now();
  const authBaseUrl = process.env.AUTH_BASE_URL?.trim().replace(/\/$/, "");
  const id = requestId(request);
  const safePath = `/${path.map((segment) => encodeURIComponent(segment)).join("/")}`;

  if (!authBaseUrl) {
    logProxy({
      requestId: id,
      method: request.method,
      path: safePath,
      status: 503,
      durationMs: 0,
      targetAvailability: "missing",
      errorCategory: "AUTH_BASE_URL_MISSING",
    });
    return json({ code: "SERVICE_UNAVAILABLE", requestId: id }, 503);
  }

  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(authBaseUrl);
    if (!/^https?:$/.test(parsedBaseUrl.protocol)) throw new Error("Unsupported protocol");
  } catch {
    logProxy({
      requestId: id,
      method: request.method,
      path: safePath,
      status: 503,
      durationMs: 0,
      targetAvailability: "invalid",
      errorCategory: "AUTH_BASE_URL_INVALID",
    });
    return json({ code: "SERVICE_UNAVAILABLE", requestId: id }, 503);
  }

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-request-id", id);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
     const upstream = await fetch(getUpstreamUrl(parsedBaseUrl.toString().replace(/\/$/, ""), path, request), {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      // Keep OAuth redirects and callback responses visible to the Better Auth client/browser.
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    const responseHeaders = new Headers();
    for (const [name, value] of upstream.headers) {
      if (name !== "set-cookie" && !HOP_BY_HOP_HEADERS.has(name)) {
        responseHeaders.append(name, value);
      }
    }
    responseHeaders.set("Cache-Control", "no-store");

    for (const cookie of getSetCookies(upstream.headers)) {
      responseHeaders.append("Set-Cookie", makeWebCookie(cookie));
    }

     if (upstream.status >= 500) {
       logProxy({
         requestId: id,
         method: request.method,
         path: safePath,
         status: 502,
         durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
         targetAvailability: "configured",
         upstreamStatus: upstream.status,
         errorCategory: "UPSTREAM_SERVER_ERROR",
       });
       return json({ code: "UPSTREAM_ERROR", requestId: id }, 502);
     }

     logProxy({
       requestId: id,
       method: request.method,
       path: safePath,
       status: upstream.status,
       durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
       targetAvailability: "configured",
       upstreamStatus: upstream.status,
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
       durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
       targetAvailability: "configured",
       errorCategory: error instanceof Error && error.name === "TimeoutError"
         ? "UPSTREAM_TIMEOUT"
         : "UPSTREAM_FETCH_FAILURE",
     });
    return json({ code: "SERVICE_UNAVAILABLE", requestId: id }, 503);
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function HEAD(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
