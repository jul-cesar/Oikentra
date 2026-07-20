import { Hono } from "hono";

import { validationError } from "../../http/errors";
import type { AppBindings } from "../../http/request-context";
import { success } from "../../http/response";
import { requireAuthHeaders } from "../../http/middleware/require-auth-headers";
import { creditsService } from "./credits.service";
import {
  cancelCreditSchema,
  cancelPaymentSchema,
  createCreditPaymentSchema,
  createCreditSchema,
  creditIdParamsSchema,
  paymentIdParamsSchema,
  creditFiltersSchema,
} from "./credits.schemas";

export const creditsRoutes = new Hono<AppBindings>();

creditsRoutes.use("*", requireAuthHeaders);
// creditsRoutes.use("*", async (c, next) => {
//   c.set("auth", {
//     userId: "test-user-123",
//     sessionId: "test-session-456",
//   });
//   await next();
// });

creditsRoutes.post("/", async (c) => {
  const parsedBody = createCreditSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsedBody.success) {
    throw validationError(parsedBody.error);
  }

  const credit = await creditsService.create(
    c.get("auth").userId,
    c.req.param("businessId")!,
    parsedBody.data,
  );

  return success(c, credit, 201);
});

creditsRoutes.get("/", async (c) => {
  const filters = creditFiltersSchema.safeParse(c.req.query());
  if (!filters.success) {
    throw validationError(filters.error);
  }

  const records = await creditsService.list(
    c.get("auth").userId,
    c.req.param("businessId")!,
    filters.data,
  );

  return success(c, records);
});

creditsRoutes.get("/:creditId", async (c) => {
  const parsedParams = creditIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const credit = await creditsService.getById(
    c.get("auth").userId,
    parsedParams.data.creditId,
    parsedParams.data.businessId,
  );

  return success(c, credit);
});

creditsRoutes.get("/:creditId/payments", async (c) => {
  const parsedParams = creditIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const payments = await creditsService.listPayments(
    c.get("auth").userId,
    parsedParams.data.creditId,
    parsedParams.data.businessId,
  );

  return success(c, payments);
});

creditsRoutes.post("/:creditId/payments", async (c) => {
  const parsedParams = creditIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const parsedBody = createCreditPaymentSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsedBody.success) {
    throw validationError(parsedBody.error);
  }

  const credit = await creditsService.createPayment(
    c.get("auth").userId,
    parsedParams.data.businessId,
    parsedParams.data.creditId,
    parsedBody.data,
  );

  return success(c, credit);
});

creditsRoutes.post("/:creditId/payments/:paymentId/cancel", async (c) => {
  const parsedParams = paymentIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const parsedBody = cancelPaymentSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsedBody.success) {
    throw validationError(parsedBody.error);
  }

  const credit = await creditsService.cancelPayment(
    c.get("auth").userId,
    parsedParams.data.creditId,
    parsedParams.data.paymentId,
    parsedParams.data.businessId,
    parsedBody.data,
  );

  return success(c, credit);
});

creditsRoutes.post("/:creditId/cancel", async (c) => {
  const parsedParams = creditIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const parsedBody = cancelCreditSchema.safeParse(await c.req.json().catch(() => null));

  if (!parsedBody.success) {
    throw validationError(parsedBody.error);
  }

  const credit = await creditsService.cancel(
    c.get("auth").userId,
    parsedParams.data.creditId,
    parsedParams.data.businessId,
    parsedBody.data,
  );

  return success(c, credit);
});
