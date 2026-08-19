import { describe, expect, mock, test } from "bun:test";

import { AppError } from "../../http/errors";

const customerRepositoryMock = {
	async findByIdAndBusiness(id: string, businessId: string) {
		return id === "customer-a" && businessId === "business-a"
			? { id, businessId }
			: null;
	},
};

mock.module("../../http/errors", () => ({ AppError }));
mock.module("../businesses/members.service", () => ({
	membersService: { async requirePermission() {} },
	permissions: {
		loansRead: "loans.read",
		loansCreate: "loans.create",
		loansCancel: "loans.cancel",
		paymentsCreate: "payments.create",
		paymentsCancel: "payments.cancel",
	},
}));
mock.module("../customers/customers.repository", () => ({
	customerRepository: customerRepositoryMock,
}));

import { createLoansService } from "./loans.service";
import type { LoanRepository } from "./loans.repository";

function createInMemoryRepository() {
	const loans = new Map<string, any>();
	const installments = new Map<string, any[]>();
	const payments = new Map<string, any[]>();

	const repository = {
		async createLoan(loan: any, schedule: any[]) {
			loans.set(loan.id, loan);
			installments.set(loan.id, schedule);
			return { loan, installments: schedule, portfolioMovement: {} };
		},
		async createPayment(payment: any, _movement: any, updates: any[]) {
			const schedule = installments.get(payment.loanId)!;
			installments.set(payment.loanId, schedule.map((item) => ({
				...item,
				...(updates.find((update) => update.id === item.id) ?? {}),
			})));
			const saved = { ...payment, cashMovementId: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date() };
			payments.set(payment.loanId, [...(payments.get(payment.loanId) ?? []), saved]);
			return { payment: saved, portfolioMovement: {} };
		},
		async findLoanById(id: string) { return loans.get(id) ?? null; },
		async findLoansByBusiness(businessId: string) { return [...loans.values()].filter((loan) => loan.businessId === businessId); },
		async findInstallmentsByLoanId(id: string) { return installments.get(id) ?? []; },
		async findPaymentsByLoanId(id: string) { return (payments.get(id) ?? []).filter((payment) => payment.status === "ACTIVE"); },
		async findPaymentById(id: string) { return [...payments.values()].flat().find((payment) => payment.id === id) ?? null; },
		async findPaymentByIdAndLoan(id: string, loanId: string) { return (payments.get(loanId) ?? []).find((payment) => payment.id === id) ?? null; },
		async updateLoanStatus(id: string, status: string, timestamp: Date) {
			const loan = loans.get(id);
			loans.set(id, { ...loan, status, updatedAt: timestamp, paidAt: status === "PAID" ? timestamp : null });
		},
		async cancelLoan(id: string, reason: string) {
			const loan = loans.get(id);
			if (!loan || loan.status !== "ACTIVE") return null;
			const cancelled = { ...loan, status: "CANCELLED", cancellationReason: reason, cancelledAt: new Date() };
			loans.set(id, cancelled);
			return cancelled;
		},
		async cancelPayment(id: string, loanId: string, reason: string, updates: any[]) {
			const records = payments.get(loanId) ?? [];
			payments.set(loanId, records.map((payment) => payment.id === id ? { ...payment, status: "CANCELLED", cancellationReason: reason } : payment));
			const schedule = installments.get(loanId)!;
			installments.set(loanId, schedule.map((item) => ({ ...item, ...(updates.find((update) => update.id === item.id) ?? {}) })));
			return { payment: records.find((payment) => payment.id === id) ?? null, portfolioMovement: null };
		},
		async getBusinessLoanSummary() { return { totalDebt: 0, customersWithDebt: 0, overdueLoans: 0 }; },
	};

	return { repository: repository as unknown as LoanRepository, installments };
}

const monthlyLoan = {
	customerId: "customer-a",
	capitalAmount: 100000,
	interestRate: 10,
	frequency: "MONTHLY" as const,
	termCount: 2,
	startDate: "2026-08-01",
};

describe("loans service", () => {
	test("generates a French amortization schedule on the server", async () => {
		const { repository } = createInMemoryRepository();
		const loan = await createLoansService(repository).create("user-a", "business-a", monthlyLoan);

		expect(loan.installmentAmount).toBe(57619);
		expect(loan.interestAmount).toBe(15238);
		expect(loan.totalAmount).toBe(115238);
		expect(loan.installments).toMatchObject([
			{ number: 1, dueDate: "2026-09-01", principalAmount: 47619, interestAmount: 10000, totalAmount: 57619 },
			{ number: 2, dueDate: "2026-10-01", principalAmount: 52381, interestAmount: 5238, totalAmount: 57619 },
		]);
	});

	test("applies a payment to installments in chronological order", async () => {
		const { repository } = createInMemoryRepository();
		const service = createLoansService(repository);
		const loan = await service.create("user-a", "business-a", { ...monthlyLoan, interestRate: 0, termCount: 3 });
		const updated = await service.createPayment("user-a", "business-a", loan.id, { amount: 40000, paymentDate: "2026-08-02" });

		expect(updated.installments).toMatchObject([
			{ paidAmount: 33333, status: "PAID" },
			{ paidAmount: 6667, status: "PARTIAL" },
			{ paidAmount: 0, status: "PENDING" },
		]);
		expect(updated.remainingAmount).toBe(60000);
	});

	test("replays the schedule when a payment is cancelled", async () => {
		const { repository } = createInMemoryRepository();
		const service = createLoansService(repository);
		const loan = await service.create("user-a", "business-a", monthlyLoan);
		const paid = await service.createPayment("user-a", "business-a", loan.id, { amount: 10000, paymentDate: "2026-08-02" });
		const paymentId = paid.payments[0]!.id;
		const cancelled = await service.cancelPayment("user-a", loan.id, paymentId, "business-a", { reason: "Registro duplicado" });

		expect(cancelled.status).toBe("ACTIVE");
		expect(cancelled.paidAmount).toBe(0);
		expect(cancelled.installments.every((item) => item.paidAmount === 0)).toBe(true);
	});
});
