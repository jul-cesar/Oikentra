import { Hono } from "hono";
import { requireAuthHeaders } from "../../http/middleware/require-auth-headers";
import type { AppBindings } from "../../http/request-context";
import { success } from "../../http/response";
import { membersService } from "./members.service";

export const invitationsRoutes = new Hono<AppBindings>();
invitationsRoutes.use("*", requireAuthHeaders);
invitationsRoutes.get("/mine", async (c) => success(c, await membersService.listMyInvitations(c.get("auth").userId)));
