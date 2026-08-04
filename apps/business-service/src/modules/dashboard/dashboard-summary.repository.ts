import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { getDb } from "../../db/client";
import { cashMovements, creditPayments, credits } from "../../db/schema";

export type DashboardSummaryRepository = {
	findActiveMovementsByBusinessAndDateRange(
		businessId: string,
		range: { from: string; to: string },
	): Promise<(typeof cashMovements.$inferSelect)[]>;
	findPendingCreditsByBusiness(
		businessId: string,
	): Promise<(typeof credits.$inferSelect)[]>;
	findActivePaymentsForCredits(
		creditIds: string[],
	): Promise<Pick<typeof creditPayments.$inferSelect, "creditId" | "amount">[]>;
};

export const dashboardSummaryRepository: DashboardSummaryRepository = {
	async findActiveMovementsByBusinessAndDateRange(businessId, range) {
		return getDb()
			.select()
			.from(cashMovements)
			.where(
				and(
					eq(cashMovements.businessId, businessId),
					eq(cashMovements.status, "ACTIVE"),
					gte(cashMovements.businessDate, range.from),
					lte(cashMovements.businessDate, range.to),
				),
			);
	},

	async findPendingCreditsByBusiness(businessId) {
		return getDb()
			.select()
			.from(credits)
			.where(
				and(eq(credits.businessId, businessId), eq(credits.status, "PENDING")),
			);
	},

	async findActivePaymentsForCredits(creditIds) {
		if (!creditIds.length) return [];
		return getDb()
			.select({
				creditId: creditPayments.creditId,
				amount: creditPayments.amount,
			})
			.from(creditPayments)
			.where(
				and(
					inArray(creditPayments.creditId, creditIds),
					eq(creditPayments.status, "ACTIVE"),
				),
			);
	},
};
