import { getConfig } from "../../config/config";
import type { Business } from "../../db/schema";
import { AppError } from "../../http/errors";
import {
	businessRepository,
	type BusinessRepository,
} from "./businesses.repository";
import { memberRepository } from "./members.repository";
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
	if (logoUrl !== `${r2.publicBaseUrl}/${logoObjectKey}`) {
		throw new AppError(
			"INVALID_BUSINESS_LOGO",
			400,
			"The business logo is not valid.",
		);
	}
}

function toBusinessResponse(business: Business): BusinessResponse {
	return {
		id: business.id,
		ownerUserId: business.ownerUserId,
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
) {
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
				await memberRepository.create({
					id: crypto.randomUUID(),
					businessId: business.id,
					userId: ownerUserId,
					role: "OWNER",
					status: "ACTIVE",
					createdAt: now,
					updatedAt: now,
				});
			}

			return toBusinessResponse(business);
		},

		async list(ownerUserId: string) {
			const owned = await repository.findManyByOwner(ownerUserId);
			if (repository !== businessRepository || !repository.findById)
				return owned.map(toBusinessResponse);
			const memberships = await memberRepository.listByUser(ownerUserId);
			const memberRecords = await Promise.all(
				memberships
					.filter(
						(member) =>
							member.userId === ownerUserId && member.status === "ACTIVE",
					)
					.map((member) => repository.findById!(member.businessId)),
			);
			const records = [
				...owned,
				...memberRecords.filter((business): business is Business =>
					Boolean(business && !owned.some((item) => item.id === business.id)),
				),
			];
			return records.map(toBusinessResponse);
		},

		async get(ownerUserId: string, businessId: string) {
			const business =
				repository === businessRepository
					? (await memberRepository.findActiveByBusinessAndUser(
							businessId,
							ownerUserId,
						)) && repository.findById
						? await repository.findById(businessId)
						: null
					: await repository.findByIdAndOwner(businessId, ownerUserId);

			if (!business) {
				throw new AppError(
					"BUSINESS_NOT_FOUND",
					404,
					"The business was not found.",
				);
			}

			return toBusinessResponse(business);
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

			return toBusinessResponse(business);
		},

		async update(
			ownerUserId: string,
			businessId: string,
			input: UpdateBusinessInput,
		) {
			if (input.name) {
				const existingBusiness = await repository.findByNameAndOwner(
					input.name,
					ownerUserId,
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

			const business = await repository.updateByIdAndOwner(
				businessId,
				ownerUserId,
				{
					...input,
					description: input.description?.trim() || input.description,
					logoObjectKey: input.logoObjectKey?.trim() || input.logoObjectKey,
				},
			);

			if (!business) {
				throw new AppError(
					"BUSINESS_NOT_FOUND",
					404,
					"The business was not found.",
				);
			}

			return toBusinessResponse(business);
		},
	};
}

export const businessesService = createBusinessesService();
