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

function generateRequestId() {
  return crypto.randomUUID();
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? generateRequestId();
  const requestOrigin = getPublicOrigin(request);
  const origin = request.headers.get("origin");

  if (!origin || origin !== requestOrigin) {
    return json({ code: "INVALID_ORIGIN", requestId }, 403);
  }

  const body = (await request.json().catch(() => null)) as
    | { token?: unknown; newPassword?: unknown }
    | null;
  const token = body?.token;
  const newPassword = body?.newPassword;

  if (typeof token !== "string" || token.length < 32 || token.length > 4096) {
    return json({ code: "INVALID_TOKEN", requestId }, 400);
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 128
  ) {
    return json({ code: "INVALID_PASSWORD", requestId }, 400);
  }

  const authBaseUrl = process.env.AUTH_BASE_URL?.trim().replace(/\/$/, "");
  if (!authBaseUrl) {
    return json({ code: "SERVICE_UNAVAILABLE", requestId }, 503);
  }

  const idempotencyKey =
    request.headers.get("x-idempotency-key") ?? generateRequestId();

  try {
    const response = await fetch(`${authBaseUrl}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: requestOrigin,
        "X-Request-Id": requestId,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ token, newPassword }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      return json({ success: true, requestId }, 200);
    }

    if (response.status === 429) {
      return json({ code: "TOO_MANY_REQUESTS", requestId }, 429);
    }

    if ([400, 401, 403, 404].includes(response.status)) {
      return json({ code: "INVALID_OR_EXPIRED_TOKEN", requestId }, 400);
    }

    return json({ code: "UPSTREAM_ERROR", requestId }, 502);
  } catch {
    return json({ code: "SERVICE_UNAVAILABLE", requestId }, 503);
  }
}
