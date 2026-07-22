import { authBaseUrl, getAuthCookie } from '@/lib/auth-client';
import { businessBaseUrl } from '@/lib/onboarding-api';
export type Member = {
  id: string;
  businessId: string;
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'OPERATOR';
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
  businessName: string | null;
  invitedByUserId: string;
  identifier: string;
  identifierType: 'EMAIL' | 'PHONE';
  role: 'MANAGER' | 'OPERATOR';
  status: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const cookie = getAuthCookie();
  const r = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...init?.headers,
    },
  });
  const b = (await r.json().catch(() => null)) as { data?: T; message?: string } | null;
  if (!r.ok || b?.data === undefined)
    throw new Error(b?.message || 'No pudimos completar la solicitud.');
  return b.data;
}
const base = (id: string) => `${businessBaseUrl}/businesses/${encodeURIComponent(id)}/members`;
export const lookupPublicUser = (identifier: string) =>
  request<PublicUser[]>(`${authBaseUrl}/users/lookup?identifier=${encodeURIComponent(identifier)}`);
export const getPublicUsers = (ids: string[]) =>
  request<PublicUser[]>(`${authBaseUrl}/users?ids=${encodeURIComponent(ids.join(','))}`);
export const getMembers = (id: string) => request<Member[]>(base(id));
export const getInvitations = (id: string) => request<Invitation[]>(`${base(id)}/invitations`);
export const createInvitation = (
  id: string,
  input: { identifier: string; targetUserId: string; role: 'MANAGER' | 'OPERATOR' }
) =>
  request<Invitation>(`${base(id)}/invitations`, { method: 'POST', body: JSON.stringify(input) });
export const revokeInvitation = (id: string, invitationId: string) =>
  request<Invitation>(`${base(id)}/invitations/${encodeURIComponent(invitationId)}/revoke`, {
    method: 'POST',
  });
export const updateMemberRole = (id: string, memberId: string, role: 'MANAGER' | 'OPERATOR') =>
  request<Member>(`${base(id)}/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
export const removeMember = (id: string, memberId: string) =>
  request<Member>(`${base(id)}/${encodeURIComponent(memberId)}/remove`, { method: 'POST' });
