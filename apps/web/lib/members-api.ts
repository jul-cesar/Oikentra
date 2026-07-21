import { authBaseUrl } from "@/lib/auth-client";

const base = (businessId: string) =>
  `/api/business/businesses/${encodeURIComponent(businessId)}/members`;

export type Member = {
  id: string;
  businessId: string;
  userId: string;
  role: "OWNER" | "MANAGER" | "OPERATOR";
  status: string;
  createdAt: string;
  updatedAt: string;
};
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phone: string | null;
};
export type Invitation = {
  id: string;
  businessId: string;
  identifier: string;
  identifierType: "EMAIL" | "PHONE";
  role: "MANAGER" | "OPERATOR";
  status: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as {
    data?: T;
    message?: string;
  } | null;
  if (!response.ok || body?.data === undefined)
    throw new Error(body?.message || "No pudimos completar la solicitud.");
  return body.data;
}
export const getPublicUsers = (ids: string[]) =>
  request<PublicUser[]>(
    `${authBaseUrl}/users?ids=${encodeURIComponent(ids.join(","))}`,
  );
export const getMembers = (businessId: string) =>
  request<Member[]>(base(businessId));
export const getInvitations = (businessId: string) =>
  request<Invitation[]>(`${base(businessId)}/invitations`);
export const createInvitation = (
  businessId: string,
  input: { identifier: string; role: "MANAGER" | "OPERATOR" },
) =>
  request<Invitation>(`${base(businessId)}/invitations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const revokeInvitation = (businessId: string, invitationId: string) =>
  request<Invitation>(
    `${base(businessId)}/invitations/${encodeURIComponent(invitationId)}/revoke`,
    { method: "POST" },
  );
export const updateMemberRole = (
  businessId: string,
  memberId: string,
  role: "MANAGER" | "OPERATOR",
) =>
  request<Member>(`${base(businessId)}/${encodeURIComponent(memberId)}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
export const removeMember = (businessId: string, memberId: string) =>
  request<Member>(
    `${base(businessId)}/${encodeURIComponent(memberId)}/remove`,
    { method: "POST" },
  );
