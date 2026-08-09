import { and, desc, eq, gte, inArray, lte, sql, sum } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
	loanInstallments,
	loanPayments,
	loans,
	portfolioMovements,
	type Loan,
	type LoanInstallment,
	type LoanPayment,
	type LoanStatus,
	type NewLoan,
	type NewLoanInstallment,
	type NewLoanPayment,
	type NewPortfolioMovement,
	type PortfolioMovement,
} from "../../db/schema";

export type LoanRepository = {
	createLoan(
		loanInput: NewLoan,
		installments: NewLoanInstallment[],
		portfolioMovementInput: NewPortfolioMovement,
	): Promise<{
		loan: Loan;
		installments: LoanInstallment[];
		portfolioMovement: PortfolioMovement;
	}>;
	createPayment(
		paymentInput: NewLoanPaymentInput,
		portfolioMovementInput: NewPortfolioMovement,
	): Promise<{ payment: LoanPayment; portfolioMovement: PortfolioMovement }>;
	findLoanById(loanId: string): Promise<Loan | null>;
	findLoansByBusiness(
		businessId: string,
		filters?: {
			customerId?: string;
			status?: LoanStatus;
			from?: string;
			to?: string;
			limit?: number;
			cursor?: string;
		},
	): Promise<Loan[]>;
	findInstallmentsByLoanId(loanId: string): Promise<LoanInstallment[]>;
	findPaymentsByLoanId(loanId: string): Promise<LoanPayment[]>;
	findPaymentById(paymentId: string): Promise<LoanPayment | null>;
	findPaymentByIdAndLoan(
		paymentId: string,
		loanId: string,
	): Promise<LoanPayment | null>;
	getLoanTotalPaid(loanId: string): Promise<number>;
	updateLoanStatus(
		loanId: string,
		status: LoanStatus,
		timestamp: Date,
	): Promise<void>;
	cancelLoan(loanId: string, reason: string): Promise<Loan | null>;
	cancelPayment(
		paymentId: string,
		loanId: string,
		reason: string,
	): Promise<{
		payment: LoanPayment | null;
		portfolioMovement: PortfolioMovement | null;
	}>;
	getBusinessLoanSummary(
		businessId: string,
	): Promise<{
		totalDebt: number;
		customersWithDebt: number;
		overdueLoans: number;
	}>;
};

type NewLoanPaymentInput = Omit<
	NewLoanPayment,
	"createdAt" | "updatedAt" | "cashMovementId"
>;

export const loanRepository: LoanRepository = {
	async createLoan(loanInput, installments, portfolioMovementInput) {
		const db = getDb();
		const now = new Date();

		return db.transaction(async (tx) => {
			const [loan] = await tx.insert(loans).values(loanInput).returning();
			const insertedInstallments =
				installments.length > 0
					? await tx.insert(loanInstallments).values(installments).returning()
					: [];
			const [portfolioMovement] = await tx
				.insert(portfolioMovements)
				.values(portfolioMovementInput)
				.returning();
			return {
				loan,
				installments: insertedInstallments,
				portfolioMovement,
			};
		});
	},

	async createPayment(paymentInput, portfolioMovementInput) {
		const db = getDb();
		const now = new Date();

		return db.transaction(async (tx) => {
			const [portfolioMovement] = await tx
				.insert(portfolioMovements)
				.values(portfolioMovementInput)
				.returning();

			const [payment] = await tx
				.insert(loanPayments)
				.values({
					...paymentInput,
					cashMovementId: portfolioMovement.id,
					createdAt: now,
					updatedAt: now,
				})
				.returning();

			return { payment, portfolioMovement };
		});
	},

	async findLoanById(loanId) {
		const db = getDb();
		const [loan] = await db
			.select()
			.from(loans)
			.where(eq(loans.id, loanId))
			.limit(1);
		return loan ?? null;
	},

	async findLoansByBusiness(businessId, filters) {
		const db = getDb();
		const conditions = [eq(loans.businessId, businessId)];

		if (filters?.customerId) {
			conditions.push(eq(loans.customerId, filters.customerId));
		}
		if (filters?.status) {
			conditions.push(eq(loans.status, filters.status));
		}
		if (filters?.from) {
			conditions.push(gte(loans.loanDate, filters.from));
		}
		if (filters?.to) {
			conditions.push(lte(loans.loanDate, filters.to));
		}

		return db
			.select()
			.from(loans)
			.where(and(...conditions))
			.orderBy(desc(loans.createdAt))
			.limit(filters?.limit ?? 50);
	},

	async findInstallmentsByLoanId(loanId) {
		const db = getDb();
		return db
			.select()
			.from(loanInstallments)
			.where(eq(loanInstallments.loanId, loanId))
			.orderBy(loanInstallments.number);
	},

	async findPaymentsByLoanId(loanId) {
		const db = getDb();
		return db
			.select()
			.from(loanPayments)
			.where(
				and(
					eq(loanPayments.loanId, loanId),
					eq(loanPayments.status, "ACTIVE"),
				),
			)
			.orderBy(desc(loanPayments.paymentDate));
	},

	async findPaymentById(paymentId) {
		const db = getDb();
		const [payment] = await db
			.select()
			.from(loanPayments)
			.where(eq(loanPayments.id, paymentId))
			.limit(1);
		return payment ?? null;
	},

	async findPaymentByIdAndLoan(paymentId, loanId) {
		const db = getDb();
		const [payment] = await db
			.select()
			.from(loanPayments)
			.where(
				and(
					eq(loanPayments.id, paymentId),
					eq(loanPayments.loanId, loanId),
				),
			)
			.limit(1);
		return payment ?? null;
	},

	async getLoanTotalPaid(loanId) {
		const db = getDb();
		const [result] = await db
			.select({ total: sum(loanPayments.amount) })
			.from(loanPayments)
			.where(
				and(
					eq(loanPayments.loanId, loanId),
					eq(loanPayments.status, "ACTIVE"),
				),
			);
		return result?.total ? Number(result.total) : 0;
	},

	async updateLoanStatus(loanId, status, timestamp) {
		const db = getDb();
		const update: Record<string, unknown> = {
			status,
			updatedAt: timestamp,
			version: sql`${loans.version} + 1`,
		};
		if (status === "PAID") {
			update.paidAt = timestamp;
		} else if (status === "CANCELLED") {
			update.cancelledAt = timestamp;
		}
		await db.update(loans).set(update).where(eq(loans.id, loanId));
	},

	async cancelLoan(loanId, reason) {
		const db = getDb();
		const now = new Date();

		return db.transaction(async (tx) => {
			const [loan] = await tx
				.update(loans)
				.set({
					status: "CANCELLED",
					cancellationReason: reason,
					cancelledAt: now,
					updatedAt: now,
					version: sql`${loans.version} + 1`,
				})
				.where(and(eq(loans.id, loanId), eq(loans.status, "PENDING")))
				.returning();

			if (!loan) return null;

			await tx
				.update(portfolioMovements)
				.set({
					status: "CANCELLED",
					cancellationReason: reason,
					cancelledAt: now,
					updatedAt: now,
					version: sql`${portfolioMovements.version} + 1`,
				})
				.where(
					and(
						eq(portfolioMovements.sourceType, "LOAN_DISBURSEMENT"),
						eq(portfolioMovements.sourceId, loanId),
						eq(portfolioMovements.status, "ACTIVE"),
					),
				);

			return loan;
		});
	},

	async cancelPayment(paymentId, loanId, reason) {
		const db = getDb();
		const now = new Date();

		return db.transaction(async (tx) => {
			const [payment] = await tx
				.update(loanPayments)
				.set({
					status: "CANCELLED",
					cancellationReason: reason,
					cancelledAt: now,
					updatedAt: now,
					version: sql`${loanPayments.version} + 1`,
				})
				.where(
					and(
						eq(loanPayments.id, paymentId),
						eq(loanPayments.loanId, loanId),
						eq(loanPayments.status, "ACTIVE"),
					),
				)
				.returning();

			if (!payment) return { payment: null, portfolioMovement: null };

			const [portfolioMovement] = await tx
				.update(portfolioMovements)
				.set({
					status: "CANCELLED",
					cancellationReason: reason,
					cancelledAt: now,
					updatedAt: now,
					version: sql`${portfolioMovements.version} + 1`,
				})
				.where(
					and(
						eq(portfolioMovements.id, payment.cashMovementId),
						eq(portfolioMovements.status, "ACTIVE"),
					),
				)
				.returning();

			return { payment, portfolioMovement };
		});
	},

	async getBusinessLoanSummary(businessId) {
		const db = getDb();
		const pending = await db
			.select()
			.from(loans)
			.where(and(eq(loans.businessId, businessId), eq(loans.status, "PENDING")));
		if (!pending.length)
			return { totalDebt: 0, customersWithDebt: 0, overdueLoans: 0 };

		const payments = await db
			.select({ loanId: loanPayments.loanId, amount: loanPayments.amount })
			.from(loanPayments)
			.where(
				and(
					inArray(
						loanPayments.loanId,
						pending.map((loan) => loan.id),
					),
					eq(loanPayments.status, "ACTIVE"),
				),
			);
		const paid = new Map<string, number>();
		for (const payment of payments)
			paid.set(
				payment.loanId,
				(paid.get(payment.loanId) ?? 0) + payment.amount,
			);

		const customers = new Set<string>();
		let totalDebt = 0;
		let overdueLoans = 0;
		const today = new Date();
		for (const loan of pending) {
			const remaining = Math.max(
				0,
				loan.totalAmount - (paid.get(loan.id) ?? 0),
			);
			if (!remaining) continue;
			totalDebt += remaining;
			customers.add(loan.customerId);
			const due = new Date(`${loan.dueDate}T00:00:00Z`);
			if (due.getTime() < today.getTime()) overdueLoans += 1;
		}
		return {
			totalDebt,
			customersWithDebt: customers.size,
			overdueLoans,
		};
	},
};
