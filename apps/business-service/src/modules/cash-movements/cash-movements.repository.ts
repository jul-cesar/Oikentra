import { and, desc, eq, ne, sql } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
	cashMovements,
	creditPayments,
	customers,
	type CashMovement,
	type NewCashMovement,
} from "../../db/schema";
import type {
	CancelCashMovementInput,
	CashMovementRecord,
} from "./types/cash-movements.types";

export type CashMovementRepository = {
	create(input: NewCashMovement): Promise<CashMovement>;
	findManyByBusiness(businessId: string): Promise<CashMovementRecord[]>;
	findByIdAndBusiness(
		movementId: string,
		businessId: string,
	): Promise<CashMovement | null>;
	cancelByIdAndBusiness(
		movementId: string,
		businessId: string,
		input: CancelCashMovementInput,
	): Promise<CashMovement | null>;
};

export const cashMovementRepository: CashMovementRepository = {
	async create(input) {
		const db = getDb();
		const [movement] = await db.insert(cashMovements).values(input).returning();
		return movement;
	},

	async findManyByBusiness(businessId) {
		const db = getDb();
		const records = await db
			.select({
				movement: cashMovements,
				sourceCustomer: {
					id: customers.id,
					name: customers.name,
				},
			})
			.from(cashMovements)
			.leftJoin(
				creditPayments,
				and(
					eq(cashMovements.sourceType, "CREDIT_PAYMENT"),
					eq(cashMovements.sourceId, creditPayments.id),
				),
			)
			.leftJoin(customers, eq(creditPayments.customerId, customers.id))
			.where(
				and(
					eq(cashMovements.businessId, businessId),
					eq(cashMovements.status, "ACTIVE"),
					ne(cashMovements.type, "CREDIT_PAYMENT"),
					ne(cashMovements.type, "LOAN_PAYMENT"),
					ne(cashMovements.type, "LOAN_DISBURSEMENT"),
				),
			)
			.orderBy(desc(cashMovements.occurredAt));

		return records.map(({ movement, sourceCustomer }) => ({
			...movement,
			sourceCustomer: sourceCustomer?.id ? sourceCustomer : null,
		}));
	},

	async findByIdAndBusiness(movementId, businessId) {
		const db = getDb();
		const [movement] = await db
			.select()
			.from(cashMovements)
			.where(
				and(
					eq(cashMovements.id, movementId),
					eq(cashMovements.businessId, businessId),
				),
			)
			.limit(1);
		return movement ?? null;
	},

	async cancelByIdAndBusiness(movementId, businessId, input) {
		const db = getDb();
		const now = new Date();

		const [movement] = await db
			.update(cashMovements)
			.set({
				status: "CANCELLED",
				cancellationReason: input.reason,
				cancelledAt: now,
				updatedAt: now,
				version: sql`${cashMovements.version} + 1`,
			})
			.where(
				and(
					eq(cashMovements.id, movementId),
					eq(cashMovements.businessId, businessId),
					eq(cashMovements.status, "ACTIVE"),
				),
			)
			.returning();

		return movement ?? null;
	},
};
