import type { z } from "zod";

import type { Business, BusinessStatus } from "../../../db/schema";
import type {
	createBusinessSchema,
	updateBusinessSchema,
} from "../businesses.schemas";

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export type BusinessResponse = {
	id: string;
	ownerUserId: string;
	name: string;
	businessType: string | null;
	description: string | null;
	logoUrl: string | null;
	logoObjectKey: string | null;
	currencyCode: string;
	timezone: string;
	status: BusinessStatus;
	version: number;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

export type BusinessRecord = Business;
