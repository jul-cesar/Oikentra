import { getConfig } from "../../config/config";
import type { Business, MemberRole } from "../../db/schema";
import { AppError } from "../../http/errors";
import {
	businessRepository,
	type BusinessRepository,
} from "./businesses.repository";
import { memberRepository, type MemberRepository } from "./members.repository";
import { createMembersService, permissions } from "./members.service";
import type {
	BusinessResponse,
	CreateBusinessInput,
	UpdateBusinessInput,
} from "./types/businesses.types";

function assertLogoOwnership(
	logoUrl?: string | null,
	logoObjectKey?: string | null,
) {
	if (!logoUrl && !logoObjectKey) return;
	const r2 = getConfig().r2;
	if (!r2 || !logoUrl || !logoObjectKey) {
		throw new AppError(
			"INVALID_BUSINESS_LOGO",
			400,
			"The business logo is not valid.",
		);
	}
	// Validamos que la URL termine en `/<objectKey>` en lugar de exigir el
	// dominio exacto de `R2_PUBLIC_BASE_URL`. Esto permite:
	// 1. Cambiar el CDN/base URL sin romper logos antiguos guardados en BD.
	// 2. Servir imágenes antiguas desde la URL legacy de R2 mientras se migran.
	// El objectKey incluye un UUID y un path privado (`business-logos/...`),
	// por lo que validar el sufijo es suficiente para evitar URLs arbitrarias.
	if (!logoUrl.endsWith(`/${logoObjectKey}`)) {
		throw new AppError(
			"INVALID_BUSINESS_LOGO",
			400,
			"The business logo is not valid.",
		);
	}
}

function toBusinessResponse(
	business: Business,
	role: MemberRole,
): BusinessResponse {
	return {
		id: business.id,
		ownerUserId: business.ownerUserId,
		role,
		name: business.name,
		businessType: business.businessType,
		description: business.description,
		logoUrl: business.logoUrl,
		logoObjectKey: business.logoObjectKey,
		currencyCode: business.currencyCode,
		timezone: business.timezone,
		status: business.status,
		version: business.version,
		createdAt: business.createdAt.toISOString(),
		updatedAt: business.updatedAt.toISOString(),
		deletedAt: business.deletedAt?.toISOString() ?? null,
	};
}

export function createBusinessesService(
	repository: BusinessRepository = businessRepository,
	membersRepository: MemberRepository = memberRepository,
) {
	const membersService = createMembersService(membersRepository);
	return {
		async create(ownerUserId: string, input: CreateBusinessInput) {
			const existingBusiness = await repository.findByNameAndOwner(
				input.name,
				ownerUserId,
			);

			if (existingBusiness) {
				throw new AppError(
					"BUSINESS_ALREADY_EXISTS",
					409,
					"A business with the same name already exists for this owner.",
				);
			}

			assertLogoOwnership(input.logoUrl, input.logoObjectKey);

			const now = new Date();
			const business = await repository.create({
				id: crypto.randomUUID(),
				ownerUserId,
				name: input.name,
				businessType: input.businessType ?? null,
				description: input.description?.trim() || null,
				logoUrl: input.logoUrl ?? null,
				logoObjectKey: input.logoObjectKey?.trim() || null,
				currencyCode: input.currencyCode ?? "COP",
				timezone: input.timezone ?? "America/Bogota",
				status: "ACTIVE",
				version: 1,
				createdAt: now,
				updatedAt: now,
			});

			if (repository === businessRepository) {
				await membersRepository.create({
					id: crypto.randomUUID(),
					businessId: business.id,
					userId: ownerUserId,
					role: "OWNER",
					status: "ACTIVE",
					createdAt: now,
					updatedAt: now,
				});
			}

			return toBusinessResponse(business, "OWNER");
		},

		async list(ownerUserId: string) {
			const owned = await repository.findManyByOwner(ownerUserId);
			const memberships = await membersRepository.listByUser(ownerUserId);
			const memberRecords = await Promise.all(
				memberships
					.filter(
						(member) =>
							member.userId === ownerUserId && member.status === "ACTIVE",
					)
					.map(async (member) => ({
						business: await repository.findById(member.businessId),
						role: member.role,
					})),
			);
			return [
				...owned.map((business) => toBusinessResponse(business, "OWNER")),
				...memberRecords
					.filter(
						(record) =>
							record.business &&
							!owned.some((business) => business.id === record.business?.id),
					)
					.map((record) =>
						toBusinessResponse(record.business as Business, record.role),
					),
			];
		},

		async get(userId: string, businessId: string) {
			const business = await repository.findById(businessId);
			if (!business) {
				throw new AppError(
					"BUSINESS_NOT_FOUND",
					404,
					"The business was not found.",
				);
			}
			const member = await membersRepository.findActiveByBusinessAndUser(
				businessId,
				userId,
			);
			if (!member) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"You do not have access to this business.",
				);
			}

			return toBusinessResponse(business, member.role);
		},

		async softDelete(ownerUserId: string, businessId: string) {
			const business = await repository.softDeleteByIdAndOwner(
				businessId,
				ownerUserId,
			);

			if (!business) {
				throw new AppError(
					"BUSINESS_NOT_FOUND",
					404,
					"The business was not found.",
				);
			}

			return toBusinessResponse(business, "OWNER");
		},

		async update(
			userId: string,
			businessId: string,
			input: UpdateBusinessInput,
		) {
			const existing = await repository.findById(businessId);
			if (!existing) {
				throw new AppError(
					"BUSINESS_NOT_FOUND",
					404,
					"The business was not found.",
				);
			}
			const member = await membersService.requirePermission(
				userId,
				businessId,
				permissions.businessUpdate,
			);

			if (input.name) {
				const existingBusiness = await repository.findByNameAndOwner(
					input.name,
					existing.ownerUserId,
					businessId,
				);

				if (existingBusiness) {
					throw new AppError(
						"BUSINESS_ALREADY_EXISTS",
						409,
						"A business with the same name already exists for this owner.",
					);
				}
			}

			assertLogoOwnership(input.logoUrl, input.logoObjectKey);

			const business = await repository.updateById(businessId, {
				...input,
				description: input.description?.trim() || input.description,
				logoObjectKey: input.logoObjectKey?.trim() || input.logoObjectKey,
			});

			if (!business) {
				throw new AppError(
					"BUSINESS_NOT_FOUND",
					404,
					"The business was not found.",
				);
			}

			return toBusinessResponse(business, member.role);
		},
	};
}

export const businessesService = createBusinessesService();
