import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
	cashMovements,
	creditPayments,
	credits,
	loanPayments,
	loans,
} from "../../db/schema";

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
	findPendingLoansByBusiness(
		businessId: string,
	): Promise<(typeof loans.$inferSelect)[]>;
	findActivePaymentsForLoans(
		loanIds: string[],
	): Promise<Pick<typeof loanPayments.$inferSelect, "loanId" | "amount">[]>;
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

	async findPendingLoansByBusiness(businessId) {
		return getDb()
			.select()
			.from(loans)
			.where(
				and(eq(loans.businessId, businessId), eq(loans.status, "PENDING")),
			);
	},

	async findActivePaymentsForLoans(loanIds) {
		if (!loanIds.length) return [];
		return getDb()
			.select({
				loanId: loanPayments.loanId,
				amount: loanPayments.amount,
			})
			.from(loanPayments)
			.where(
				and(
					inArray(loanPayments.loanId, loanIds),
					eq(loanPayments.status, "ACTIVE"),
				),
			);
	},
};
