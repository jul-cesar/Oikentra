import { AppError } from "../../http/errors";
import { memberRepository, type MemberRepository } from "./members.repository";
import type { InvitationIdentifierType, MemberRole } from "../../db/schema";
import { businessRepository } from "./businesses.repository";

export const permissions = {
  customersRead: "customers.read",
  customersCreate: "customers.create",
  customersUpdate: "customers.update",
  customersArchive: "customers.archive",
  creditsRead: "credits.read",
  creditsCreate: "credits.create",
  creditsCancel: "credits.cancel",
  loansRead: "loans.read",
  loansCreate: "loans.create",
  loansCancel: "loans.cancel",
  paymentsCreate: "payments.create",
  paymentsCancel: "payments.cancel",
  cashRead: "cash.read",
  cashCreate: "cash.create",
  cashCancel: "cash.cancel",
  membersManage: "members.manage",
  reportsRead: "reports.read",
} as const;

const rolePermissions: Record<MemberRole, readonly string[]> = {
  OWNER: Object.values(permissions),
  MANAGER: Object.values(permissions).filter(
    (permission) => permission !== permissions.membersManage,
  ),
  OPERATOR: [
    permissions.customersRead,
    permissions.customersCreate,
    permissions.creditsRead,
    permissions.creditsCreate,
    permissions.loansRead,
    permissions.loansCreate,
    permissions.paymentsCreate,
    permissions.cashRead,
    permissions.cashCreate,
  ],
};

function toResponse(
  member: Awaited<ReturnType<MemberRepository["findById"]>> extends infer T
    ? Exclude<T, null>
    : never,
) {
  return {
    id: member.id,
    businessId: member.businessId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

export function createMembersService(
  repository: MemberRepository = memberRepository,
) {
  return {
    async requirePermission(
      userId: string,
      businessId: string,
      permission: string,
    ) {
      const member = await repository.findActiveByBusinessAndUser(
        businessId,
        userId,
      );
      if (!member)
        throw new AppError(
          "BUSINESS_ACCESS_DENIED",
          403,
          "You do not have access to this business.",
        );
      if (!rolePermissions[member.role].includes(permission))
        throw new AppError(
          "BUSINESS_PERMISSION_DENIED",
          403,
          "You do not have permission to perform this action.",
        );
      return member;
    },
    async list(userId: string, businessId: string) {
      await this.requirePermission(
        userId,
        businessId,
        permissions.membersManage,
      );
      return (await repository.listByBusiness(businessId)).map(toResponse);
    },
    async createInvitation(
      ownerUserId: string,
      businessId: string,
      input: { identifier: string; targetUserId: string; role: MemberRole },
    ) {
      await this.requirePermission(
        ownerUserId,
        businessId,
        permissions.membersManage,
      );
      const identifier = input.identifier.includes("@")
        ? input.identifier.toLocaleLowerCase()
        : input.identifier.replace(/\D/g, "");
      const identifierType: InvitationIdentifierType =
        input.identifier.includes("@") ? "EMAIL" : "PHONE";
      const now = new Date();
      return toInvitationResponse(
        await repository.createInvitation({
          id: crypto.randomUUID(),
          businessId,
          invitedByUserId: ownerUserId,
          targetUserId: input.targetUserId,
          identifier,
          identifierType,
          role: input.role === "OWNER" ? "OPERATOR" : input.role,
          status: "PENDING",
          expiresAt: new Date(now.getTime() + 7 * 86400000),
          createdAt: now,
          updatedAt: now,
        }),
      );
    },
    async listInvitations(ownerUserId: string, businessId: string) {
      await this.requirePermission(
        ownerUserId,
        businessId,
        permissions.membersManage,
      );
      return (await repository.listInvitations(businessId)).map((invitation) =>
        toInvitationResponse(invitation),
      );
    },
    async listMyInvitations(userId: string) {
      const invitations = (await repository.listInvitationsByTargetUser(userId)).filter(
        (invitation) => invitation.status === "PENDING" && invitation.expiresAt > new Date(),
      );
      return Promise.all(
        invitations.map(async (invitation) => {
          const business = await businessRepository.findById?.(invitation.businessId);
          return toInvitationResponse(invitation, business?.name ?? null);
        }),
      );
    },
    async acceptInvitation(userId: string, businessId: string, invitationId: string) {
      const accepted = await repository.acceptInvitation(invitationId, businessId, userId);
      if (!accepted) throw new AppError("INVITATION_NOT_FOUND", 404, "The invitation was not found or has expired.");
      return toResponse(accepted.member);
    },
    async revokeInvitation(
      ownerUserId: string,
      businessId: string,
      invitationId: string,
    ) {
      await this.requirePermission(
        ownerUserId,
        businessId,
        permissions.membersManage,
      );
      const invitation = await repository.revokeInvitation(
        invitationId,
        businessId,
      );
      if (!invitation)
        throw new AppError(
          "INVITATION_NOT_FOUND",
          404,
          "The invitation was not found.",
        );
      return toInvitationResponse(invitation);
    },
    async add(
      ownerUserId: string,
      businessId: string,
      input: { userId: string; role: MemberRole },
    ) {
      await this.requirePermission(
        ownerUserId,
        businessId,
        permissions.membersManage,
      );
      if (input.role === "OWNER")
        throw new AppError(
          "INVALID_MEMBER_ROLE",
          400,
          "A business can only have one owner.",
        );
      const now = new Date();
      return toResponse(
        await repository.create({
          id: crypto.randomUUID(),
          businessId,
          userId: input.userId,
          role: input.role,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        }),
      );
    },
    async updateRole(
      ownerUserId: string,
      businessId: string,
      memberId: string,
      role: MemberRole,
    ) {
      await this.requirePermission(
        ownerUserId,
        businessId,
        permissions.membersManage,
      );
      const member = await repository.findById(memberId);
      if (!member || member.businessId !== businessId)
        throw new AppError(
          "MEMBER_NOT_FOUND",
          404,
          "The member was not found.",
        );
      if (member.role === "OWNER" || role === "OWNER")
        throw new AppError(
          "INVALID_MEMBER_ROLE",
          400,
          "The owner role cannot be changed here.",
        );
      const updated = await repository.updateRole(memberId, role);
      if (!updated)
        throw new AppError(
          "MEMBER_NOT_FOUND",
          404,
          "The member was not found.",
        );
      return toResponse(updated);
    },
    async remove(ownerUserId: string, businessId: string, memberId: string) {
      await this.requirePermission(
        ownerUserId,
        businessId,
        permissions.membersManage,
      );
      const member = await repository.findById(memberId);
      if (!member || member.businessId !== businessId)
        throw new AppError(
          "MEMBER_NOT_FOUND",
          404,
          "The member was not found.",
        );
      if (member.role === "OWNER")
        throw new AppError(
          "OWNER_CANNOT_BE_REMOVED",
          400,
          "The business owner cannot be removed.",
        );
      const removed = await repository.deactivate(memberId);
      if (!removed)
        throw new AppError(
          "MEMBER_NOT_FOUND",
          404,
          "The member was not found.",
        );
      return toResponse(removed);
    },
  };
}

function toInvitationResponse(invitation: {
  id: string;
  businessId: string;
  identifier: string;
  identifierType: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  invitedByUserId: string;
}, businessName: string | null = null) {
  return {
    id: invitation.id,
    businessId: invitation.businessId,
    businessName,
    invitedByUserId: invitation.invitedByUserId,
    identifier: invitation.identifier,
    identifierType: invitation.identifierType,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
  };
}

export const membersService = createMembersService();
