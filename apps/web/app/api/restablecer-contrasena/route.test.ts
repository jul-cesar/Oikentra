import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "./route";

test("forwards Better Auth's 24-character reset token", async () => {
  const originalFetch = globalThis.fetch;
  const originalAuthBaseUrl = process.env.AUTH_BASE_URL;
  const token = "123456789012345678901234";
  let fetchCalls = 0;
  const fetchMock: typeof fetch = async (_input, init) => {
    fetchCalls += 1;
    assert.deepEqual(JSON.parse(String(init?.body)), {
      token,
      newPassword: "new-password",
    });
    return Response.json({ status: true });
  };

  globalThis.fetch = fetchMock;
  process.env.AUTH_BASE_URL = "http://localhost:3001/api/auth";

  try {
    const response = await POST(
      new Request("http://localhost:3000/api/restablecer-contrasena", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ token, newPassword: "new-password" }),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalAuthBaseUrl === undefined) delete process.env.AUTH_BASE_URL;
    else process.env.AUTH_BASE_URL = originalAuthBaseUrl;
  }
});
