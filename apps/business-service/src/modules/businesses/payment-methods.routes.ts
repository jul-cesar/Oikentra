import { Hono } from "hono";

import { validationError } from "../../http/errors";
import type { AppBindings } from "../../http/request-context";
import { requireAuthHeaders } from "../../http/middleware/require-auth-headers";
import { success } from "../../http/response";
import { paymentMethodsService } from "./payment-methods.service";
import {
	createPaymentMethodSchema,
	paymentMethodIdParamsSchema,
	updatePaymentMethodSchema,
} from "./payment-methods.schemas";

export const paymentMethodsRoutes = new Hono<AppBindings>();

paymentMethodsRoutes.use("*", requireAuthHeaders);

paymentMethodsRoutes.get("/", async (c) => {
	const methods = await paymentMethodsService.list(
		c.get("auth").userId,
		c.req.param("businessId")!,
	);

	return success(c, methods);
});

paymentMethodsRoutes.post("/", async (c) => {
	const parsedBody = createPaymentMethodSchema.safeParse(
		await c.req.json().catch(() => null),
	);

	if (!parsedBody.success) {
		throw validationError(parsedBody.error);
	}

	const method = await paymentMethodsService.create(
		c.get("auth").userId,
		c.req.param("businessId")!,
		parsedBody.data,
	);

	return success(c, method, 201);
});

paymentMethodsRoutes.put("/:paymentMethodId", async (c) => {
	const parsedParams = paymentMethodIdParamsSchema.safeParse(c.req.param());

	if (!parsedParams.success) {
		throw validationError(parsedParams.error);
	}

	const parsedBody = updatePaymentMethodSchema.safeParse(
		await c.req.json().catch(() => null),
	);

	if (!parsedBody.success) {
		throw validationError(parsedBody.error);
	}

	const method = await paymentMethodsService.update(
		c.get("auth").userId,
		parsedParams.data.businessId,
		parsedParams.data.paymentMethodId,
		parsedBody.data,
	);

	return success(c, method);
});

paymentMethodsRoutes.post("/:paymentMethodId/deactivate", async (c) => {
	const parsedParams = paymentMethodIdParamsSchema.safeParse(c.req.param());

	if (!parsedParams.success) {
		throw validationError(parsedParams.error);
	}

	const method = await paymentMethodsService.deactivate(
		c.get("auth").userId,
		parsedParams.data.businessId,
		parsedParams.data.paymentMethodId,
	);

	return success(c, method);
});
