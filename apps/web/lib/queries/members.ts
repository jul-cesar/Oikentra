import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvitation,
  createInvitation,
  getInvitations,
  getMyInvitations,
  getMembers,
  getPublicUsers,
  removeMember,
  revokeInvitation,
  updateMemberRole,
} from "@/lib/members-api";

export const memberQueryKeys = {
  members: (businessId: string) => ["business-members", businessId] as const,
  invitations: (businessId: string) =>
    ["business-invitations", businessId] as const,
  myInvitations: ["my-business-invitations"] as const,
};
export function useMyInvitations() { return useQuery({ queryKey: memberQueryKeys.myInvitations, queryFn: getMyInvitations }); }
export function useAcceptInvitation() { const client = useQueryClient(); return useMutation({ mutationFn: ({ businessId, invitationId }: { businessId: string; invitationId: string }) => acceptInvitation(businessId, invitationId), onSuccess: () => { void client.invalidateQueries({ queryKey: memberQueryKeys.myInvitations }); void client.invalidateQueries({ queryKey: ["businesses"] }); } }); }
export function useMembers(businessId: string) {
  return useQuery({
    queryKey: memberQueryKeys.members(businessId),
    queryFn: () => getMembers(businessId),
    enabled: Boolean(businessId),
  });
}
export function useInvitations(businessId: string) {
  return useQuery({
    queryKey: memberQueryKeys.invitations(businessId),
    queryFn: () => getInvitations(businessId),
    enabled: Boolean(businessId),
  });
}
export function usePublicUsers(ids: string[]) {
  return useQuery({
    queryKey: ["public-users", ...ids],
    queryFn: () => getPublicUsers(ids),
    enabled: ids.length > 0,
  });
}
function invalidate(
  client: ReturnType<typeof useQueryClient>,
  businessId: string,
) {
  void client.invalidateQueries({
    queryKey: memberQueryKeys.members(businessId),
  });
  void client.invalidateQueries({
    queryKey: memberQueryKeys.invitations(businessId),
  });
}
export function useCreateInvitation(businessId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createInvitation>[1]) =>
      createInvitation(businessId, input),
    onSuccess: () => invalidate(client, businessId),
  });
}
export function useRevokeInvitation(businessId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      revokeInvitation(businessId, invitationId),
    onSuccess: () => invalidate(client, businessId),
  });
}
export function useUpdateMemberRole(businessId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: "MANAGER" | "OPERATOR";
    }) => updateMemberRole(businessId, memberId, role),
    onSuccess: () => invalidate(client, businessId),
  });
}
export function useRemoveMember(businessId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(businessId, memberId),
    onSuccess: () => invalidate(client, businessId),
  });
}
