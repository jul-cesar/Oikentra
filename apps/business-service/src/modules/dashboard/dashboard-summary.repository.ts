import { and, eq, gte, inArray, lte, ne } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
	cashMovements,
	creditMovements,
	creditPayments,
	credits,
	loanPayments,
	loans,
	portfolioMovements,
} from "../../db/schema";

export type DashboardSummaryRepository = {
	findActiveMovementsByBusinessAndDateRange(
		businessId: string,
		range: { from: string; to: string },
	): Promise<(typeof cashMovements.$inferSelect)[]>;
	findActivePortfolioMovementsByBusinessAndDateRange(
		businessId: string,
		range: { from: string; to: string },
	): Promise<(typeof portfolioMovements.$inferSelect)[]>;
	findActiveCreditMovementsByBusinessAndDateRange(
		businessId: string,
		range: { from: string; to: string },
	): Promise<(typeof creditMovements.$inferSelect)[]>;
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
					ne(cashMovements.type, "CREDIT_PAYMENT"),
					ne(cashMovements.type, "LOAN_PAYMENT"),
					ne(cashMovements.type, "LOAN_DISBURSEMENT"),
				),
			);
	},

	async findActivePortfolioMovementsByBusinessAndDateRange(businessId, range) {
		return getDb()
			.select()
			.from(portfolioMovements)
			.where(
				and(
					eq(portfolioMovements.businessId, businessId),
					eq(portfolioMovements.status, "ACTIVE"),
					gte(portfolioMovements.businessDate, range.from),
					lte(portfolioMovements.businessDate, range.to),
				),
			);
	},

	async findActiveCreditMovementsByBusinessAndDateRange(businessId, range) {
		return getDb()
			.select()
			.from(creditMovements)
			.where(
				and(
					eq(creditMovements.businessId, businessId),
					eq(creditMovements.status, "ACTIVE"),
					gte(creditMovements.businessDate, range.from),
					lte(creditMovements.businessDate, range.to),
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
