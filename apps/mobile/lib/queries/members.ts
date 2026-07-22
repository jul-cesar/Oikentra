import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInvitation,
  getInvitations,
  getMembers,
  getPublicUsers,
  lookupPublicUser,
  removeMember,
  revokeInvitation,
  updateMemberRole,
} from '@/lib/members-api';
export const memberKeys = {
  members: (id: string) => ['business-members', id] as const,
  invitations: (id: string) => ['business-invitations', id] as const,
  users: (ids: string[]) => ['public-users', ...ids] as const,
};
export const useMembers = (id: string) =>
  useQuery({
    queryKey: memberKeys.members(id),
    queryFn: () => getMembers(id),
    enabled: Boolean(id),
  });
export const useInvitations = (id: string) =>
  useQuery({
    queryKey: memberKeys.invitations(id),
    queryFn: () => getInvitations(id),
    enabled: Boolean(id),
  });
export const usePublicUsers = (ids: string[]) =>
  useQuery({
    queryKey: memberKeys.users(ids),
    queryFn: () => getPublicUsers(ids),
    enabled: ids.length > 0,
  });
function invalidate(c: ReturnType<typeof useQueryClient>, id: string) {
  void c.invalidateQueries({ queryKey: memberKeys.members(id) });
  void c.invalidateQueries({ queryKey: memberKeys.invitations(id) });
}
export const useCreateInvitation = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: async (input: { identifier: string; role: 'MANAGER' | 'OPERATOR' }) => {
      const matches = await lookupPublicUser(input.identifier);
      if (!matches.length) throw new Error('No encontramos una cuenta con ese correo o teléfono.');
      return createInvitation(id, { ...input, targetUserId: matches[0].id });
    },
    onSuccess: () => invalidate(c, id),
  });
};
export const useRevokeInvitation = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(id, invitationId),
    onSuccess: () => invalidate(c, id),
  });
};
export const useUpdateMemberRole = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'MANAGER' | 'OPERATOR' }) =>
      updateMemberRole(id, memberId, role),
    onSuccess: () => invalidate(c, id),
  });
};
export const useRemoveMember = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(id, memberId),
    onSuccess: () => invalidate(c, id),
  });
};
