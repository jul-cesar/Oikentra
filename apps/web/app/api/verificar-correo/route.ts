const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
} as const;

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });
}

function getPublicOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const requestOrigin = getPublicOrigin(request);
  const origin = request.headers.get("origin");

  if (origin && origin !== requestOrigin) {
    return json({ code: "INVALID_ORIGIN" }, 403);
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = body?.token;

  if (typeof token !== "string" || token.length < 32 || token.length > 4096) {
    return json({ code: "INVALID_TOKEN" }, 400);
  }

  const authBaseUrl = process.env.AUTH_BASE_URL?.trim().replace(/\/$/, "");
  if (!authBaseUrl) {
    return json({ code: "SERVICE_UNAVAILABLE" }, 503);
  }

  const verificationUrl = new URL(`${authBaseUrl}/verify-email`);
  verificationUrl.searchParams.set("token", token);

  try {
    const response = await fetch(verificationUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      return json({ success: true }, 200);
    }

    if (response.status === 429) {
      return json({ code: "TOO_MANY_REQUESTS" }, 429);
    }

    if ([400, 401, 403, 404].includes(response.status)) {
      return json({ code: "INVALID_OR_EXPIRED_TOKEN" }, 400);
    }

    return json({ code: "UPSTREAM_ERROR" }, 502);
  } catch {
    return json({ code: "SERVICE_UNAVAILABLE" }, 503);
  }
}
