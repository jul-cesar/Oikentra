import { and, desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
	businessPaymentMethods,
	type BusinessPaymentMethod,
	type NewBusinessPaymentMethod,
} from "../../db/schema";

export const DEFAULT_PAYMENT_METHODS = [
	"Efectivo",
	"Transferencia",
	"Datáfono",
] as const;

export type PaymentMethodRepository = {
	create(input: NewBusinessPaymentMethod): Promise<BusinessPaymentMethod>;
	createMany(
		inputs: NewBusinessPaymentMethod[],
	): Promise<BusinessPaymentMethod[]>;
	findManyByBusiness(businessId: string): Promise<BusinessPaymentMethod[]>;
	findActiveByName(
		businessId: string,
		name: string,
	): Promise<BusinessPaymentMethod | null>;
	updateByIdAndBusiness(
		paymentMethodId: string,
		businessId: string,
		data: { name: string; updatedAt: Date },
	): Promise<BusinessPaymentMethod | null>;
	deactivateByIdAndBusiness(
		paymentMethodId: string,
		businessId: string,
		updatedAt: Date,
	): Promise<BusinessPaymentMethod | null>;
};

export const paymentMethodRepository: PaymentMethodRepository = {
	async create(input) {
		const [method] = await getDb()
			.insert(businessPaymentMethods)
			.values(input)
			.returning();
		return method;
	},

	async createMany(inputs) {
		if (!inputs.length) return [];
		return getDb().insert(businessPaymentMethods).values(inputs).returning();
	},

	async findManyByBusiness(businessId) {
		return getDb()
			.select()
			.from(businessPaymentMethods)
			.where(
				and(
					eq(businessPaymentMethods.businessId, businessId),
					eq(businessPaymentMethods.status, "ACTIVE"),
				),
			)
			.orderBy(desc(businessPaymentMethods.createdAt));
	},

	async findActiveByName(businessId, name) {
		const [method] = await getDb()
			.select()
			.from(businessPaymentMethods)
			.where(
				and(
					eq(businessPaymentMethods.businessId, businessId),
					eq(businessPaymentMethods.name, name),
					eq(businessPaymentMethods.status, "ACTIVE"),
				),
			)
			.limit(1);
		return method ?? null;
	},

	async updateByIdAndBusiness(paymentMethodId, businessId, data) {
		const [method] = await getDb()
			.update(businessPaymentMethods)
			.set({ name: data.name, updatedAt: data.updatedAt })
			.where(
				and(
					eq(businessPaymentMethods.id, paymentMethodId),
					eq(businessPaymentMethods.businessId, businessId),
					eq(businessPaymentMethods.status, "ACTIVE"),
				),
			)
			.returning();
		return method ?? null;
	},

	async deactivateByIdAndBusiness(paymentMethodId, businessId, updatedAt) {
		const [method] = await getDb()
			.update(businessPaymentMethods)
			.set({ status: "INACTIVE", updatedAt })
			.where(
				and(
					eq(businessPaymentMethods.id, paymentMethodId),
					eq(businessPaymentMethods.businessId, businessId),
					eq(businessPaymentMethods.status, "ACTIVE"),
				),
			)
			.returning();
		return method ?? null;
	},
};
