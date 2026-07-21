import { Hono } from "hono";
import { requireAuthHeaders } from "../../http/middleware/require-auth-headers";
import { validationError } from "../../http/errors";
import type { AppBindings } from "../../http/request-context";
import { success } from "../../http/response";
import { membersService } from "./members.service";
import {
  addMemberSchema,
  createInvitationSchema,
  invitationParamsSchema,
  memberParamsSchema,
  updateMemberSchema,
} from "./members.schemas";

export const membersRoutes = new Hono<AppBindings>();
membersRoutes.use("*", requireAuthHeaders);

membersRoutes.get("/", async (c) =>
  success(
    c,
    await membersService.list(c.get("auth").userId, c.req.param("businessId")!),
  ),
);
membersRoutes.get("/invitations/mine", async (c) =>
  success(c, await membersService.listMyInvitations(c.get("auth").userId)),
);
membersRoutes.post("/invitations/:invitationId/accept", async (c) => {
  const params = invitationParamsSchema.safeParse({
    businessId: c.req.param("businessId"),
    invitationId: c.req.param("invitationId"),
  });
  if (!params.success) throw validationError(params.error);
  return success(
    c,
    await membersService.acceptInvitation(
      c.get("auth").userId,
      params.data.businessId,
      params.data.invitationId,
    ),
  );
});
membersRoutes.get("/invitations", async (c) =>
  success(
    c,
    await membersService.listInvitations(
      c.get("auth").userId,
      c.req.param("businessId")!,
    ),
  ),
);
membersRoutes.post("/invitations", async (c) => {
  const parsed = createInvitationSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) throw validationError(parsed.error);
  return success(
    c,
    await membersService.createInvitation(
      c.get("auth").userId,
      c.req.param("businessId")!,
      parsed.data,
    ),
    201,
  );
});
membersRoutes.post("/invitations/:invitationId/revoke", async (c) => {
  const params = invitationParamsSchema.safeParse(c.req.param());
  if (!params.success) throw validationError(params.error);
  return success(
    c,
    await membersService.revokeInvitation(
      c.get("auth").userId,
      params.data.businessId,
      params.data.invitationId,
    ),
  );
});

membersRoutes.post("/", async (c) => {
  const parsed = addMemberSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) throw validationError(parsed.error);
  return success(
    c,
    await membersService.add(
      c.get("auth").userId,
      c.req.param("businessId")!,
      parsed.data,
    ),
    201,
  );
});
membersRoutes.patch("/:memberId", async (c) => {
  const params = memberParamsSchema.safeParse(c.req.param());
  const body = updateMemberSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!params.success) throw validationError(params.error);
  if (!body.success) throw validationError(body.error);
  return success(
    c,
    await membersService.updateRole(
      c.get("auth").userId,
      params.data.businessId,
      params.data.memberId,
      body.data.role,
    ),
  );
});
membersRoutes.post("/:memberId/remove", async (c) => {
  const params = memberParamsSchema.safeParse(c.req.param());
  if (!params.success) throw validationError(params.error);
  return success(
    c,
    await membersService.remove(
      c.get("auth").userId,
      params.data.businessId,
      params.data.memberId,
    ),
  );
});
