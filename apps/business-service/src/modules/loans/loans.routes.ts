import { Hono } from "hono";

import { validationError } from "../../http/errors";
import type { AppBindings } from "../../http/request-context";
import { success } from "../../http/response";
import { requireAuthHeaders } from "../../http/middleware/require-auth-headers";
import { loansService } from "./loans.service";
import {
  cancelLoanPaymentSchema,
  cancelLoanSchema,
  createLoanPaymentSchema,
  createLoanSchema,
  loanFiltersSchema,
  loanIdParamsSchema,
  loanPaymentIdParamsSchema,
} from "./loans.schemas";

export const loansRoutes = new Hono<AppBindings>();

loansRoutes.use("*", requireAuthHeaders);

loansRoutes.post("/", async (c) => {
  const parsedBody = createLoanSchema.safeParse(
    await c.req.json().catch(() => null),
  );

  if (!parsedBody.success) {
    throw validationError(parsedBody.error);
  }

  const loan = await loansService.create(
    c.get("auth").userId,
    c.req.param("businessId")!,
    parsedBody.data,
  );

  return success(c, loan, 201);
});

loansRoutes.get("/summary", async (c) => {
  const summary = await loansService.summary(
    c.get("auth").userId,
    c.req.param("businessId")!,
  );
  return success(c, summary);
});

loansRoutes.get("/", async (c) => {
  const filters = loanFiltersSchema.safeParse(c.req.query());
  if (!filters.success) {
    throw validationError(filters.error);
  }

  const records = await loansService.list(
    c.get("auth").userId,
    c.req.param("businessId")!,
    filters.data,
  );

  return success(c, records);
});

loansRoutes.get("/:loanId", async (c) => {
  const parsedParams = loanIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const loan = await loansService.getById(
    c.get("auth").userId,
    parsedParams.data.loanId,
    parsedParams.data.businessId,
  );

  return success(c, loan);
});

loansRoutes.get("/:loanId/payments", async (c) => {
  const parsedParams = loanIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const payments = await loansService.listPayments(
    c.get("auth").userId,
    parsedParams.data.loanId,
    parsedParams.data.businessId,
  );

  return success(c, payments);
});

loansRoutes.post("/:loanId/payments", async (c) => {
  const parsedParams = loanIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const parsedBody = createLoanPaymentSchema.safeParse(
    await c.req.json().catch(() => null),
  );

  if (!parsedBody.success) {
    throw validationError(parsedBody.error);
  }

  const loan = await loansService.createPayment(
    c.get("auth").userId,
    parsedParams.data.businessId,
    parsedParams.data.loanId,
    parsedBody.data,
  );

  return success(c, loan);
});

loansRoutes.post("/:loanId/payments/:paymentId/cancel", async (c) => {
  const parsedParams = loanPaymentIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const parsedBody = cancelLoanPaymentSchema.safeParse(
    await c.req.json().catch(() => null),
  );

  if (!parsedBody.success) {
    throw validationError(parsedBody.error);
  }

  const loan = await loansService.cancelPayment(
    c.get("auth").userId,
    parsedParams.data.loanId,
    parsedParams.data.paymentId,
    parsedParams.data.businessId,
    parsedBody.data,
  );

  return success(c, loan);
});

loansRoutes.post("/:loanId/cancel", async (c) => {
  const parsedParams = loanIdParamsSchema.safeParse(c.req.param());

  if (!parsedParams.success) {
    throw validationError(parsedParams.error);
  }

  const parsedBody = cancelLoanSchema.safeParse(
    await c.req.json().catch(() => null),
  );

  if (!parsedBody.success) {
    throw validationError(parsedBody.error);
  }

  const loan = await loansService.cancel(
    c.get("auth").userId,
    parsedParams.data.loanId,
    parsedParams.data.businessId,
    parsedBody.data,
  );

  return success(c, loan);
});
