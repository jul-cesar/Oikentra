import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
	loanInstallments,
	loanPayments,
	loans,
	portfolioMovements,
	type Loan,
	type LoanInstallment,
	type LoanInstallmentStatus,
	type LoanPayment,
	type LoanStatus,
	type NewLoan,
	type NewLoanInstallment,
	type NewLoanPayment,
	type NewPortfolioMovement,
	type PortfolioMovement,
} from "../../db/schema";

export type InstallmentPaymentUpdate = {
	id: string;
	paidAmount: number;
	status: LoanInstallmentStatus;
};

export type LoanRepository = {
	createLoan(loanInput: NewLoan, installments: NewLoanInstallment[], portfolioMovementInput: NewPortfolioMovement): Promise<{ loan: Loan; installments: LoanInstallment[]; portfolioMovement: PortfolioMovement }>;
	createPayment(paymentInput: NewLoanPaymentInput, portfolioMovementInput: NewPortfolioMovement, installmentUpdates: InstallmentPaymentUpdate[]): Promise<{ payment: LoanPayment; portfolioMovement: PortfolioMovement }>;
	findLoanById(loanId: string): Promise<Loan | null>;
	findLoansByBusiness(businessId: string, filters?: LoanFilters): Promise<Loan[]>;
	findInstallmentsByLoanId(loanId: string): Promise<LoanInstallment[]>;
	findPaymentsByLoanId(loanId: string): Promise<LoanPayment[]>;
	findPaymentById(paymentId: string): Promise<LoanPayment | null>;
	findPaymentByIdAndLoan(paymentId: string, loanId: string): Promise<LoanPayment | null>;
	updateLoanStatus(loanId: string, status: LoanStatus, timestamp: Date): Promise<void>;
	cancelLoan(loanId: string, reason: string): Promise<Loan | null>;
	cancelPayment(paymentId: string, loanId: string, reason: string, installmentUpdates: InstallmentPaymentUpdate[]): Promise<{ payment: LoanPayment | null; portfolioMovement: PortfolioMovement | null }>;
	getBusinessLoanSummary(businessId: string): Promise<{ totalDebt: number; customersWithDebt: number; overdueLoans: number }>;
};

type LoanFilters = {
	customerId?: string;
	status?: LoanStatus;
	from?: string;
	to?: string;
	limit?: number;
	cursor?: string;
};

type NewLoanPaymentInput = Omit<NewLoanPayment, "createdAt" | "updatedAt" | "cashMovementId">;

type DatabaseTransaction = Parameters<
	Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

async function applyInstallmentUpdates(
	tx: DatabaseTransaction,
	updates: InstallmentPaymentUpdate[],
	now: Date,
) {
	for (const installment of updates) {
		await tx
			.update(loanInstallments)
			.set({
				paidAmount: installment.paidAmount,
				status: installment.status,
				updatedAt: now,
				version: sql`${loanInstallments.version} + 1`,
			})
			.where(eq(loanInstallments.id, installment.id));
	}
}

export const loanRepository: LoanRepository = {
	async createLoan(loanInput, installments, portfolioMovementInput) {
		const db = getDb();
		return db.transaction(async (tx) => {
			const [loan] = await tx.insert(loans).values(loanInput).returning();
			const savedInstallments = installments.length
				? await tx.insert(loanInstallments).values(installments).returning()
				: [];
			const [portfolioMovement] = await tx.insert(portfolioMovements).values(portfolioMovementInput).returning();
			return { loan, installments: savedInstallments, portfolioMovement };
		});
	},

	async createPayment(paymentInput, portfolioMovementInput, installmentUpdates) {
		const db = getDb();
		const now = new Date();
		return db.transaction(async (tx) => {
			const [portfolioMovement] = await tx.insert(portfolioMovements).values(portfolioMovementInput).returning();
			const [payment] = await tx
				.insert(loanPayments)
				.values({ ...paymentInput, cashMovementId: portfolioMovement.id, createdAt: now, updatedAt: now })
				.returning();
			await applyInstallmentUpdates(tx, installmentUpdates, now);
			return { payment, portfolioMovement };
		});
	},

	async findLoanById(loanId) {
		const [loan] = await getDb().select().from(loans).where(eq(loans.id, loanId)).limit(1);
		return loan ?? null;
	},

	async findLoansByBusiness(businessId, filters) {
		const conditions = [eq(loans.businessId, businessId)];
		if (filters?.customerId) conditions.push(eq(loans.customerId, filters.customerId));
		if (filters?.status) conditions.push(eq(loans.status, filters.status));
		if (filters?.from) conditions.push(gte(loans.loanDate, filters.from));
		if (filters?.to) conditions.push(lte(loans.loanDate, filters.to));
		return getDb().select().from(loans).where(and(...conditions)).orderBy(desc(loans.createdAt)).limit(filters?.limit ?? 50);
	},

	async findInstallmentsByLoanId(loanId) {
		return getDb().select().from(loanInstallments).where(eq(loanInstallments.loanId, loanId)).orderBy(asc(loanInstallments.dueDate), asc(loanInstallments.number));
	},

	async findPaymentsByLoanId(loanId) {
		return getDb()
			.select()
			.from(loanPayments)
			.where(and(eq(loanPayments.loanId, loanId), eq(loanPayments.status, "ACTIVE")))
			.orderBy(desc(loanPayments.paymentDate), desc(loanPayments.createdAt));
	},

	async findPaymentById(paymentId) {
		const [payment] = await getDb().select().from(loanPayments).where(eq(loanPayments.id, paymentId)).limit(1);
		return payment ?? null;
	},

	async findPaymentByIdAndLoan(paymentId, loanId) {
		const [payment] = await getDb().select().from(loanPayments).where(and(eq(loanPayments.id, paymentId), eq(loanPayments.loanId, loanId))).limit(1);
		return payment ?? null;
	},

	async updateLoanStatus(loanId, status, timestamp) {
		await getDb().update(loans).set({
			status,
			updatedAt: timestamp,
			paidAt: status === "PAID" ? timestamp : null,
			version: sql`${loans.version} + 1`,
		}).where(eq(loans.id, loanId));
	},

	async cancelLoan(loanId, reason) {
		const db = getDb();
		const now = new Date();
		return db.transaction(async (tx) => {
			const [loan] = await tx.update(loans).set({ status: "CANCELLED", cancellationReason: reason, cancelledAt: now, updatedAt: now, version: sql`${loans.version} + 1` }).where(and(eq(loans.id, loanId), eq(loans.status, "ACTIVE"))).returning();
			if (!loan) return null;
			await tx.update(portfolioMovements).set({ status: "CANCELLED", cancellationReason: reason, cancelledAt: now, updatedAt: now, version: sql`${portfolioMovements.version} + 1` }).where(and(eq(portfolioMovements.sourceType, "LOAN_DISBURSEMENT"), eq(portfolioMovements.sourceId, loanId), eq(portfolioMovements.status, "ACTIVE")));
			return loan;
		});
	},

	async cancelPayment(paymentId, loanId, reason, installmentUpdates) {
		const db = getDb();
		const now = new Date();
		return db.transaction(async (tx) => {
			const [payment] = await tx.update(loanPayments).set({ status: "CANCELLED", cancellationReason: reason, cancelledAt: now, updatedAt: now, version: sql`${loanPayments.version} + 1` }).where(and(eq(loanPayments.id, paymentId), eq(loanPayments.loanId, loanId), eq(loanPayments.status, "ACTIVE"))).returning();
			if (!payment) return { payment: null, portfolioMovement: null };
			const [portfolioMovement] = await tx.update(portfolioMovements).set({ status: "CANCELLED", cancellationReason: reason, cancelledAt: now, updatedAt: now, version: sql`${portfolioMovements.version} + 1` }).where(and(eq(portfolioMovements.id, payment.cashMovementId), eq(portfolioMovements.status, "ACTIVE"))).returning();
			await applyInstallmentUpdates(tx, installmentUpdates, now);
			return { payment, portfolioMovement: portfolioMovement ?? null };
		});
	},

	async getBusinessLoanSummary(businessId) {
		const db = getDb();
		const activeLoans = await db.select().from(loans).where(and(eq(loans.businessId, businessId), eq(loans.status, "ACTIVE")));
		if (!activeLoans.length) return { totalDebt: 0, customersWithDebt: 0, overdueLoans: 0 };
		const activeLoanIds = activeLoans.map((loan) => loan.id);
		const installments = await db
			.select()
			.from(loanInstallments)
			.where(inArray(loanInstallments.loanId, activeLoanIds));
		const debtByLoan = new Map<string, number>();
		for (const item of installments) debtByLoan.set(item.loanId, (debtByLoan.get(item.loanId) ?? 0) + Math.max(0, item.totalAmount - item.paidAmount));
		const today = new Date().toISOString().slice(0, 10);
		const customers = new Set<string>();
		let totalDebt = 0;
		let overdueLoans = 0;
		for (const loan of activeLoans) {
			const remaining = debtByLoan.get(loan.id) ?? 0;
			if (!remaining) continue;
			totalDebt += remaining;
			customers.add(loan.customerId);
			if (installments.some((item) => item.loanId === loan.id && item.dueDate < today && item.paidAmount < item.totalAmount)) overdueLoans += 1;
		}
		return { totalDebt, customersWithDebt: customers.size, overdueLoans };
	},
};
