import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "../../db/client";
import { customers, type Customer, type NewCustomer } from "../../db/schema";
import type { UpdateCustomerInput } from "./types/customers.types";

export type CustomerRepository = {
	create(input: NewCustomer): Promise<Customer>;
	findManyByBusiness(businessId: string): Promise<Customer[]>;
	countActiveByBusiness(businessId: string): Promise<number>;
	findByIdAndBusiness(
		customerId: string,
		businessId: string,
	): Promise<Customer | null>;
	updateByIdAndBusiness(
		customerId: string,
		businessId: string,
		input: UpdateCustomerInput,
	): Promise<Customer | null>;
	softDeleteByIdAndBusiness(
		customerId: string,
		businessId: string,
	): Promise<Customer | null>;
};

export const customerRepository: CustomerRepository = {
	async create(input) {
		const db = getDb();
		const [customer] = await db.insert(customers).values(input).returning();
		return customer;
	},

	async findManyByBusiness(businessId) {
		const db = getDb();
		return db
			.select()
			.from(customers)
			.where(
				and(eq(customers.businessId, businessId), isNull(customers.deletedAt)),
			)
			.orderBy(desc(customers.createdAt));
	},

	async countActiveByBusiness(businessId) {
		const db = getDb();
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(customers)
			.where(
				and(
					eq(customers.businessId, businessId),
					eq(customers.status, "ACTIVE"),
					isNull(customers.deletedAt),
				),
			);
		return result?.count ?? 0;
	},

	async findByIdAndBusiness(customerId, businessId) {
		const db = getDb();
		const [customer] = await db
			.select()
			.from(customers)
			.where(
				and(
					eq(customers.id, customerId),
					eq(customers.businessId, businessId),
					isNull(customers.deletedAt),
				),
			)
			.limit(1);
		return customer ?? null;
	},

	async updateByIdAndBusiness(customerId, businessId, input) {
		const db = getDb();
		const [customer] = await db
			.update(customers)
			.set({
				...input,
				updatedAt: new Date(),
				version: sql`${customers.version} + 1`,
			})
			.where(
				and(
					eq(customers.id, customerId),
					eq(customers.businessId, businessId),
					isNull(customers.deletedAt),
				),
			)
			.returning();
		return customer ?? null;
	},

	async softDeleteByIdAndBusiness(customerId, businessId) {
		const db = getDb();
		const now = new Date();

		const [customer] = await db
			.update(customers)
			.set({
				status: "INACTIVE",
				deletedAt: now,
				updatedAt: now,
				version: sql`${customers.version} + 1`,
			})
			.where(
				and(
					eq(customers.id, customerId),
					eq(customers.businessId, businessId),
					isNull(customers.deletedAt),
				),
			)
			.returning();

		return customer ?? null;
	},
};
