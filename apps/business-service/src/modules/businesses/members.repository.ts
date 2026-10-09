import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import {
  businessInvitations,
  businessMembers,
  tasks,
  type BusinessInvitation,
  type BusinessMember,
  type NewBusinessInvitation,
  type NewBusinessMember,
  type MemberRole,
} from "../../db/schema";

export type MemberRepository = {
  create(input: NewBusinessMember): Promise<BusinessMember>;
  findActiveByBusinessAndUser(
    businessId: string,
    userId: string,
  ): Promise<BusinessMember | null>;
  findById(id: string): Promise<BusinessMember | null>;
  listByBusiness(businessId: string): Promise<BusinessMember[]>;
  listByUser(userId: string): Promise<BusinessMember[]>;
  updateRole(id: string, role: MemberRole): Promise<BusinessMember | null>;
  deactivate(id: string): Promise<BusinessMember | null>;
  createInvitation(input: NewBusinessInvitation): Promise<BusinessInvitation>;
  listInvitations(businessId: string): Promise<BusinessInvitation[]>;
  listInvitationsByTargetUser(userId: string): Promise<BusinessInvitation[]>;
  revokeInvitation(
    id: string,
    businessId: string,
  ): Promise<BusinessInvitation | null>;
  acceptInvitation(
    id: string,
    businessId: string,
    userId: string,
  ): Promise<{ invitation: BusinessInvitation; member: BusinessMember } | null>;
};

export const memberRepository: MemberRepository = {
  async create(input) {
    const [member] = await getDb()
      .insert(businessMembers)
      .values(input)
      .returning();
    return member;
  },
  async findActiveByBusinessAndUser(businessId, userId) {
    const [member] = await getDb()
      .select()
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.userId, userId),
          eq(businessMembers.status, "ACTIVE"),
        ),
      )
      .limit(1);
    return member ?? null;
  },
  async findById(id) {
    const [member] = await getDb()
      .select()
      .from(businessMembers)
      .where(eq(businessMembers.id, id))
      .limit(1);
    return member ?? null;
  },
  async listByBusiness(businessId) {
    return getDb()
      .select()
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.status, "ACTIVE"),
        ),
      )
      .orderBy(asc(businessMembers.createdAt));
  },
  async listByUser(userId) {
    return getDb()
      .select()
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.status, "ACTIVE"),
        ),
      )
      .orderBy(asc(businessMembers.createdAt));
  },
  async updateRole(id, role) {
    const [member] = await getDb()
      .update(businessMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(businessMembers.id, id))
      .returning();
    return member ?? null;
  },
  async deactivate(id) {
    return getDb().transaction(async (tx) => {
      const updatedAt = new Date();
      const [member] = await tx
        .update(businessMembers)
        .set({ status: "INACTIVE", updatedAt })
        .where(eq(businessMembers.id, id))
        .returning();
      if (!member) return null;
      await tx
        .update(tasks)
        .set({
          assigneeMemberId: null,
          updatedAt,
          version: sql`${tasks.version} + 1`,
        })
        .where(
          and(
            eq(tasks.businessId, member.businessId),
            eq(tasks.assigneeMemberId, member.id),
          ),
        );
      return member;
    });
  },
  async createInvitation(input) {
    const [invitation] = await getDb()
      .insert(businessInvitations)
      .values(input)
      .returning();
    return invitation;
  },
  async listInvitations(businessId) {
    return getDb()
      .select()
      .from(businessInvitations)
      .where(eq(businessInvitations.businessId, businessId))
      .orderBy(asc(businessInvitations.createdAt));
  },
  async listInvitationsByTargetUser(userId) {
    return getDb()
      .select()
      .from(businessInvitations)
      .where(eq(businessInvitations.targetUserId, userId))
      .orderBy(asc(businessInvitations.createdAt));
  },
  async revokeInvitation(id, businessId) {
    const [invitation] = await getDb()
      .update(businessInvitations)
      .set({ status: "REVOKED", updatedAt: new Date() })
      .where(
        and(
          eq(businessInvitations.id, id),
          eq(businessInvitations.businessId, businessId),
          eq(businessInvitations.status, "PENDING"),
        ),
      )
      .returning();
    return invitation ?? null;
  },
  async acceptInvitation(id, businessId, userId) {
    return getDb().transaction(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(businessInvitations)
        .where(
          and(
            eq(businessInvitations.id, id),
            eq(businessInvitations.businessId, businessId),
            eq(businessInvitations.targetUserId, userId),
            eq(businessInvitations.status, "PENDING"),
          ),
        )
        .limit(1);
      if (!invitation || invitation.expiresAt < new Date()) return null;
      const now = new Date();
      const [member] = await tx
        .insert(businessMembers)
        .values({
          id: crypto.randomUUID(),
          businessId: invitation.businessId,
          userId,
          role: invitation.role,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [businessMembers.businessId, businessMembers.userId],
          set: { role: invitation.role, status: "ACTIVE", updatedAt: now },
        })
        .returning();
      const [accepted] = await tx
        .update(businessInvitations)
        .set({ status: "ACCEPTED", updatedAt: now })
        .where(
          and(
            eq(businessInvitations.id, id),
            eq(businessInvitations.status, "PENDING"),
          ),
        )
        .returning();
      return accepted ? { invitation: accepted, member } : null;
    });
  },
};
