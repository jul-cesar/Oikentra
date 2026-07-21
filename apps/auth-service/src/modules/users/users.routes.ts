import { and, eq, inArray, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getAuth } from "../../auth";
import { getDb } from "../../db/client";
import { user, userProfiles } from "../../db/schema";

type UserBindings = { Variables: { requestId: string } };
export const usersRoutes = new Hono<UserBindings>();

usersRoutes.get("/lookup", async (c) => {
  const headers = new Headers(c.req.raw.headers);
  headers.set("X-Request-Id", c.get("requestId"));
  const session = await getAuth().api.getSession({ headers });
  if (!session)
    return c.json(
      {
        code: "UNAUTHENTICATED",
        message: "A valid session is required.",
        requestId: c.get("requestId"),
      },
      401,
    );
  const identifier = c.req.query("identifier")?.trim() ?? "";
  if (!identifier) return c.json({ data: [], requestId: c.get("requestId") });
  const normalized = identifier.includes("@")
    ? identifier.toLocaleLowerCase()
    : identifier.replace(/\D/g, "");
  const records = await getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      phone: userProfiles.phone,
    })
    .from(user)
    .leftJoin(userProfiles, eq(userProfiles.userId, user.id))
    .where(
      or(
        sql`lower(${user.email}) = ${normalized}`,
        sql`regexp_replace(coalesce(${userProfiles.phone}, ''), '[^0-9]', '', 'g') = ${normalized}`,
      ),
    )
    .limit(1);
  return c.json({ data: records, requestId: c.get("requestId") });
});

usersRoutes.get("/", async (c) => {
  const headers = new Headers(c.req.raw.headers);
  headers.set("X-Request-Id", c.get("requestId"));
  const session = await getAuth().api.getSession({ headers });
  if (!session)
    return c.json(
      {
        code: "UNAUTHENTICATED",
        message: "A valid session is required.",
        requestId: c.get("requestId"),
      },
      401,
    );

  const ids = [
    ...new Set(
      (c.req.query("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].slice(0, 100);
  if (!ids.length) return c.json({ data: [], requestId: c.get("requestId") });
  const records = await getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      phone: userProfiles.phone,
    })
    .from(user)
    .leftJoin(userProfiles, eq(userProfiles.userId, user.id))
    .where(inArray(user.id, ids));
  return c.json({ data: records, requestId: c.get("requestId") });
});
