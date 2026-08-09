import { z } from "zod";

import { businessStatuses, businessTypes } from "../../db/schema";

export const businessIdParamsSchema = z.object({
	businessId: z.string().min(1),
});

export const logoUploadSchema = z.object({
	contentType: z.enum([
		"image/png",
		"image/jpeg",
		"image/webp",
		"image/svg+xml",
	]),
});

const businessDescriptionSchema = z
	.string()
	.trim()
	.max(280)
	.optional()
	.nullable();
const businessLogoUrlSchema = z.url().max(2048).optional().nullable();
const businessLogoObjectKeySchema = z
	.string()
	.trim()
	.max(512)
	.optional()
	.nullable();

export const createBusinessSchema = z.object({
	name: z.string().trim().min(1).max(120),
	businessType: z.enum(businessTypes).optional(),
	description: businessDescriptionSchema,
	logoUrl: businessLogoUrlSchema,
	logoObjectKey: businessLogoObjectKeySchema,
	currencyCode: z.string().trim().length(3).toUpperCase().optional(),
	timezone: z.string().trim().min(1).max(80).optional(),
});

export const updateBusinessSchema = z
	.object({
		name: z.string().trim().min(1).max(120).optional(),
		businessType: z.enum(businessTypes).nullable().optional(),
		description: businessDescriptionSchema,
		logoUrl: businessLogoUrlSchema,
		logoObjectKey: businessLogoObjectKeySchema,
		currencyCode: z.string().trim().length(3).toUpperCase().optional(),
		timezone: z.string().trim().min(1).max(80).optional(),
		status: z.enum(businessStatuses).optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one field must be provided.",
	});
