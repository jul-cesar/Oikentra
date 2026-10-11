import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(file: string) {
  return readFile(new URL(file, import.meta.url), "utf8");
}

test("keeps the settings navigation focus ring inside its scroll container", async () => {
  const navigation = await source("./business-settings-nav.tsx");

  assert.match(navigation, /focus-visible:ring-inset/);
});

test("shows loading and retryable error states for section queries", async () => {
  const paymentMethods = await source("./payment-methods-settings.tsx");
  const collaborators = await source("./collaborators-settings.tsx");

  assert.match(paymentMethods, /if \(methodsQuery\.isLoading\)/);
  assert.match(paymentMethods, /methodsQuery\.error/);
  assert.match(paymentMethods, /methodsQuery\.refetch/);
  assert.match(paymentMethods, /role="alert"/);

  assert.match(collaborators, /members\.isLoading/);
  assert.match(collaborators, /invitations\.isLoading/);
  assert.match(collaborators, /members\.error/);
  assert.match(collaborators, /invitations\.error/);
  assert.match(collaborators, /members\.refetch/);
  assert.match(collaborators, /invitations\.refetch/);
  assert.match(collaborators, /role="alert"/);
});
