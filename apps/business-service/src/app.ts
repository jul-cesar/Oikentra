import { Hono } from "hono";
import {
  logError,
  requestIdMiddleware,
  requestLoggerMiddleware,
} from "@oikentra/http-logging";

import { checkDatabaseConnection } from "./db/health";
import { AppError } from "./http/errors";
import type { AppBindings } from "./http/request-context";
import { success } from "./http/response";
import { businessesRoutes } from "./modules/businesses/businesses.routes";
import { membersRoutes } from "./modules/businesses/members.routes";
import { invitationsRoutes } from "./modules/businesses/invitations.routes";
import { paymentMethodsRoutes } from "./modules/businesses/payment-methods.routes";
import { customersRoutes } from "./modules/customers/customers.routes";
import { dashboardSummaryRoutes } from "./modules/dashboard/dashboard-summary.routes";
import { cashMovementsRoutes } from "./modules/cash-movements/cash-movements.routes";
import { cashMovementCategoriesRoutes } from "./modules/cash-movements/cash-movement-categories.routes";
import { creditsRoutes } from "./modules/credits/credits.routes";
import { loansRoutes } from "./modules/loans/loans.routes";
import { agendaRoutes } from "./modules/agenda/agenda.routes";
import { tasksRoutes } from "./modules/tasks/tasks.routes";

export const app = new Hono<AppBindings>();

app.use("*", requestIdMiddleware());
app.use("*", requestLoggerMiddleware("business-service"));

app.get("/api/business/health/live", (c) => {
  return success(c, { status: "ok", service: "business-service" });
});

app.get("/api/business/health/ready", async (c) => {
  try {
    await checkDatabaseConnection();
  } catch (error) {
    throw new AppError(
      "DEPENDENCY_UNAVAILABLE",
      503,
      "The database is unavailable.",
    );
  }

  return success(c, { status: "ready", service: "business-service" });
});

app.route("/api/business/businesses", businessesRoutes);
app.route("/api/business/invitations", invitationsRoutes);
app.route("/api/business/businesses/:businessId/members", membersRoutes);
app.route(
  "/api/business/businesses/:businessId/payment-methods",
  paymentMethodsRoutes,
);
app.route("/api/business/businesses/:businessId/customers", customersRoutes);
app.route(
  "/api/business/businesses/:businessId/dashboard-summary",
  dashboardSummaryRoutes,
);
app.route(
  "/api/business/businesses/:businessId/cash-movements",
  cashMovementsRoutes,
);
app.route(
  "/api/business/businesses/:businessId/cash-movement-categories",
  cashMovementCategoriesRoutes,
);
app.route("/api/business/businesses/:businessId/credits", creditsRoutes);
app.route("/api/business/businesses/:businessId/loans", loansRoutes);
app.route("/api/business/businesses/:businessId/agenda", agendaRoutes);
app.route("/api/business/businesses/:businessId/tasks", tasksRoutes);

app.onError((error, c) => {
  const requestId = c.get("requestId") ?? crypto.randomUUID();

  if (error instanceof AppError) {
    logError("business-service", error, c, error.status);

    return c.json(
      {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
      error.status,
    );
  }

  console.error(error);

  return c.json(
    {
      code: "INTERNAL_SERVER_ERROR",
      message: "An internal error occurred.",
      details: error instanceof Error ? error.message : null,
      requestId,
    },
    500,
  );
});
