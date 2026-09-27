import { describe, expect, test } from "bun:test";

import type {
	Business,
	BusinessMember,
	MemberRole,
	NewBusiness,
} from "../../db/schema";
import { createBusinessesService } from "./businesses.service";
import type { BusinessRepository } from "./businesses.repository";
import type { MemberRepository } from "./members.repository";
import type { UpdateBusinessInput } from "./types/businesses.types";

function createInMemoryBusinessRepository(
	seed: Business[] = [],
): BusinessRepository {
	const records = new Map<string, Business>(
		seed.map((business) => [business.id, business]),
	);

	return {
		async create(input: NewBusiness) {
			records.set(input.id, input as Business);
			return input as Business;
		},

		async findManyByOwner(ownerUserId: string) {
			return Array.from(records.values()).filter(
				(business) =>
					business.ownerUserId === ownerUserId && !business.deletedAt,
			);
		},

		async findById(businessId: string) {
			const business = records.get(businessId);
			return business && !business.deletedAt ? business : null;
		},

		async findByIdAndOwner(businessId: string, ownerUserId: string) {
			const business = records.get(businessId);
			if (
				!business ||
				business.ownerUserId !== ownerUserId ||
				business.deletedAt
			) {
				return null;
			}
			return business;
		},

		async findByNameAndOwner(
			name: string,
			ownerUserId: string,
			excludeId?: string,
		) {
			const normalized = name.toLowerCase();
			return (
				Array.from(records.values()).find(
					(business) =>
						business.ownerUserId === ownerUserId &&
						business.name.toLowerCase() === normalized &&
						business.status === "ACTIVE" &&
						!business.deletedAt &&
						business.id !== excludeId,
				) ?? null
			);
		},

		async updateById(businessId: string, input: UpdateBusinessInput) {
			const business = records.get(businessId);
			if (!business || business.deletedAt) return null;
			const updated = {
				...business,
				...input,
				updatedAt: new Date(),
			} as Business;
			records.set(businessId, updated);
			return updated;
		},

		async updateByIdAndOwner(
			businessId: string,
			ownerUserId: string,
			input: UpdateBusinessInput,
		) {
			const business = records.get(businessId);
			if (
				!business ||
				business.ownerUserId !== ownerUserId ||
				business.deletedAt
			) {
				return null;
			}
			const updated = {
				...business,
				...input,
				updatedAt: new Date(),
			} as Business;
			records.set(businessId, updated);
			return updated;
		},

		async softDeleteByIdAndOwner(businessId: string, ownerUserId: string) {
			const business = records.get(businessId);
			if (
				!business ||
				business.ownerUserId !== ownerUserId ||
				business.deletedAt
			) {
				return null;
			}
			const now = new Date();
			const updated = {
				...business,
				status: "INACTIVE",
				deletedAt: now,
				updatedAt: now,
			} as Business;
			records.set(businessId, updated);
			return updated;
		},
	};
}

function createMemberRepository(
	businessId: string,
	userId: string,
	role: MemberRole | null,
): MemberRepository {
	const member: BusinessMember | null = role
		? {
				id: crypto.randomUUID(),
				businessId,
				userId,
				role,
				status: "ACTIVE",
				createdAt: new Date(),
				updatedAt: new Date(),
			}
		: null;
	return {
		async findActiveByBusinessAndUser(candidateBusinessId, candidateUserId) {
			return candidateBusinessId === businessId && candidateUserId === userId
				? member
				: null;
		},
		async listByUser(candidateUserId) {
			return member && candidateUserId === userId ? [member] : [];
		},
	} as MemberRepository;
}

function makeBusiness(overrides: Partial<Business> = {}): Business {
	const now = new Date();
	return {
		id: crypto.randomUUID(),
		ownerUserId: "owner-a",
		name: "Business",
		businessType: "STORE",
		description: null,
		logoUrl: null,
		logoObjectKey: null,
		currencyCode: "COP",
		timezone: "America/Bogota",
		status: "ACTIVE",
		version: 1,
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
		...overrides,
	};
}

describe("businesses service owner scoping", () => {
	test("create assigns the requesting user as owner", async () => {
		const service = createBusinessesService(createInMemoryBusinessRepository());

		const business = await service.create("owner-a", { name: "Tienda A" });

		expect(business.ownerUserId).toBe("owner-a");
	});

	test("list only returns businesses owned by the requesting user", async () => {
		const repository = createInMemoryBusinessRepository([
			makeBusiness({ ownerUserId: "owner-a", name: "Tienda A" }),
			makeBusiness({ ownerUserId: "owner-b", name: "Tienda B" }),
		]);
		const service = createBusinessesService(
			repository,
			createMemberRepository("unused", "owner-a", null),
		);

		const records = await service.list("owner-a");

		expect(records).toHaveLength(1);
		expect(records[0].name).toBe("Tienda A");
		expect(records[0].role).toBe("OWNER");
	});

	test("list returns the requesting member role", async () => {
		const business = makeBusiness({ ownerUserId: "owner-a" });
		const service = createBusinessesService(
			createInMemoryBusinessRepository([business]),
			createMemberRepository(business.id, "manager-b", "MANAGER"),
		);

		const records = await service.list("manager-b");

		expect(records).toHaveLength(1);
		expect(records[0].role).toBe("MANAGER");
	});

	test("get returns the requesting member role", async () => {
		const business = makeBusiness({ ownerUserId: "owner-a" });
		const service = createBusinessesService(
			createInMemoryBusinessRepository([business]),
			createMemberRepository(business.id, "manager-b", "MANAGER"),
		);

		const result = await service.get("manager-b", business.id);

		expect(result.role).toBe("MANAGER");
	});

	test("update allows an administrator who belongs to the business", async () => {
		const business = makeBusiness({ ownerUserId: "owner-a" });
		const service = createBusinessesService(
			createInMemoryBusinessRepository([business]),
			createMemberRepository(business.id, "manager-b", "MANAGER"),
		);

		const result = await service.update("manager-b", business.id, {
			name: "Administrado",
		});

		expect(result.name).toBe("Administrado");
		expect(result.role).toBe("MANAGER");
	});

	test("update rejects an operator who belongs to the business", async () => {
		const business = makeBusiness({ ownerUserId: "owner-a" });
		const service = createBusinessesService(
			createInMemoryBusinessRepository([business]),
			createMemberRepository(business.id, "operator-b", "OPERATOR"),
		);

		await expect(
			service.update("operator-b", business.id, { name: "Hacked" }),
		).rejects.toMatchObject({
			code: "BUSINESS_PERMISSION_DENIED",
			status: 403,
		});
	});

	test("update rejects a user who does not belong to the business", async () => {
		const business = makeBusiness({ ownerUserId: "owner-a" });
		const service = createBusinessesService(
			createInMemoryBusinessRepository([business]),
			createMemberRepository(business.id, "outsider-b", null),
		);

		await expect(
			service.update("outsider-b", business.id, { name: "Hacked" }),
		).rejects.toMatchObject({ code: "BUSINESS_ACCESS_DENIED", status: 403 });
	});

	test("update reports a missing business before checking membership", async () => {
		const missingBusinessId = crypto.randomUUID();
		const service = createBusinessesService(
			createInMemoryBusinessRepository(),
			createMemberRepository(missingBusinessId, "manager-b", "MANAGER"),
		);

		await expect(
			service.update("manager-b", missingBusinessId, { name: "Missing" }),
		).rejects.toMatchObject({ code: "BUSINESS_NOT_FOUND", status: 404 });
	});

	test("softDelete rejects a business owned by another user", async () => {
		const business = makeBusiness({ ownerUserId: "owner-a" });
		const service = createBusinessesService(
			createInMemoryBusinessRepository([business]),
		);

		await expect(service.softDelete("owner-b", business.id)).rejects.toThrow(
			"The business was not found.",
		);
	});
});
