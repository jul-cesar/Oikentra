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
  "x-device-id",
  "x-idempotency-key",
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
  return candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)
    ? candidate
    : crypto.randomUUID();
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
  url.search = new URL(request.url).search;
  return url;
}

async function proxy(request: Request, path: string[]) {
  const authBaseUrl = process.env.AUTH_BASE_URL?.trim().replace(/\/$/, "");
  const id = requestId(request);

  if (!authBaseUrl) {
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
    const upstream = await fetch(getUpstreamUrl(authBaseUrl, path, request), {
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

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
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
