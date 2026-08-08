import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { AppError } from "../../http/errors";
import type { LoanRepository } from "./loans.repository";
import type {
	Loan,
	LoanPayment,
	NewLoan,
	NewLoanInstallment,
	NewCashMovement,
	CashMovement,
} from "../../db/schema";

type Customer = {
	id: string;
	businessId: string;
};

const customerRepositoryMock = {
	async findByIdAndBusiness(id: string, businessId: string) {
		const customers: Customer[] = [
			{ id: "customer-a", businessId: "business-a" },
			{ id: "customer-b", businessId: "business-b" },
		];
		return customers.find(
			(customer) =>
				customer.id === id && customer.businessId === businessId,
		) ?? null;
	},
};

const membersServiceMock = {
	async requirePermission(_userId: string, _businessId: string, permission: string) {
		if (permission === "forbidden") {
			throw new AppError("FORBIDDEN", 403, "Forbidden.");
		}
	},
};

const permissionsMock = {
	loansRead: "loans.read",
	loansCreate: "loans.create",
	loansCancel: "loans.cancel",
	paymentsCreate: "payments.create",
	paymentsCancel: "payments.cancel",
};

mock.module("../../http/errors", () => ({
	AppError,
}));
mock.module("../businesses/members.service", () => ({
	membersService: membersServiceMock,
	permissions: permissionsMock,
}));
mock.module("../customers/customers.repository", () => ({
	customerRepository: customerRepositoryMock,
}));

import { createLoansService } from "./loans.service";

function makeLoan(overrides: Partial<Loan> = {}): Loan {
	const now = new Date();
	return {
		id: crypto.randomUUID(),
		userId: "user-a",
		businessId: "business-a",
		customerId: "customer-a",
		capitalAmount: 100000,
		interestAmount: 20000,
		totalAmount: 120000,
		termCount: 1,
		description: null,
		loanDate: "2026-08-01",
		dueDate: "2026-08-01",
		status: "PENDING",
		cancellationReason: null,
		paidAt: null,
		cancelledAt: null,
		version: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makePayment(loanId: string, overrides: Partial<LoanPayment> = {}): LoanPayment {
	const now = new Date();
	return {
		id: crypto.randomUUID(),
		userId: "user-a",
		businessId: "business-a",
		loanId,
		customerId: "customer-a",
		cashMovementId: crypto.randomUUID(),
		amount: 10000,
		paymentDate: "2026-08-05",
		note: null,
		status: "ACTIVE",
		cancellationReason: null,
		cancelledAt: null,
		version: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function createInMemoryLoanRepository(seed: Loan[] = []): LoanRepository & {
	payments: LoanPayment[];
	disbursementMovements: CashMovement[];
} {
	const loans = new Map<string, Loan>(seed.map((loan) => [loan.id, loan]));
	const payments: LoanPayment[] = [];
	const disbursementMovements: CashMovement[] = [];

	const repo: LoanRepository & {
		payments: LoanPayment[];
		disbursementMovements: CashMovement[];
	} = {
		payments,
		disbursementMovements,

		async createLoan(
			loanInput: NewLoan,
			installments: NewLoanInstallment[],
			cashMovementInput: NewCashMovement,
		) {
			const loan = loanInput as Loan;
			loans.set(loan.id, loan);
			disbursementMovements.push(cashMovementInput as CashMovement);
			return {
				loan,
				installments: installments.map((installment) => ({
					id: installment.id,
					loanId: installment.loanId,
					number: installment.number,
					dueDate: installment.dueDate,
					amount: installment.amount,
					version: 1,
					createdAt: new Date(),
					updatedAt: new Date(),
				})),
				cashMovement: cashMovementInput as CashMovement,
			};
		},

		async createPayment(paymentInput, cashMovementInput) {
			const payment = {
				...paymentInput,
				status: "ACTIVE",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as LoanPayment;
			payments.push(payment);
			return { payment, cashMovement: cashMovementInput as CashMovement };
		},

		async findLoanById(loanId) {
			return loans.get(loanId) ?? null;
		},

		async findLoansByBusiness(businessId, filters) {
			return Array.from(loans.values()).filter(
				(loan) =>
					loan.businessId === businessId &&
					(!filters?.customerId || loan.customerId === filters.customerId) &&
					(!filters?.status || loan.status === filters.status),
			);
		},

		async findInstallmentsByLoanId(loanId) {
			return [];
		},

		async findPaymentsByLoanId(loanId) {
			return payments.filter(
				(payment) => payment.loanId === loanId && payment.status === "ACTIVE",
			);
		},

		async findPaymentById(paymentId) {
			return payments.find((payment) => payment.id === paymentId) ?? null;
		},

		async findPaymentByIdAndLoan(paymentId, loanId) {
			return (
				payments.find(
					(payment) => payment.id === paymentId && payment.loanId === loanId,
				) ?? null
			);
		},

		async getLoanTotalPaid(loanId) {
			return payments
				.filter(
					(payment) =>
						payment.loanId === loanId && payment.status === "ACTIVE",
				)
				.reduce((sum, payment) => sum + payment.amount, 0);
		},

		async updateLoanStatus(loanId, status, timestamp) {
			const loan = loans.get(loanId);
			if (loan) {
				loans.set(loanId, {
					...loan,
					status,
					updatedAt: timestamp,
					...(status === "PAID" ? { paidAt: timestamp } : {}),
					...(status === "CANCELLED" ? { cancelledAt: timestamp } : {}),
				});
			}
		},

		async cancelLoan(loanId, reason) {
			const loan = loans.get(loanId);
			if (!loan || loan.status !== "PENDING") return null;
			const cancelled = {
				...loan,
				status: "CANCELLED" as const,
				cancellationReason: reason,
				cancelledAt: new Date(),
				updatedAt: new Date(),
			};
			loans.set(loanId, cancelled);
			return cancelled;
		},

		async cancelPayment(paymentId, loanId, reason) {
			const payment = payments.find(
				(p) => p.id === paymentId && p.loanId === loanId && p.status === "ACTIVE",
			);
			if (!payment) return { payment: null, cashMovement: null };
			const cancelled = {
				...payment,
				status: "CANCELLED" as const,
				cancellationReason: reason,
				cancelledAt: new Date(),
				updatedAt: new Date(),
			};
			const index = payments.indexOf(payment);
			payments[index] = cancelled;
			return { payment: cancelled, cashMovement: null };
		},

		async getBusinessLoanSummary(businessId) {
			const pendingLoans = Array.from(loans.values()).filter(
				(loan) =>
					loan.businessId === businessId && loan.status === "PENDING",
			);
			let totalDebt = 0;
			for (const loan of pendingLoans) {
				const paid = payments
					.filter(
						(p) => p.loanId === loan.id && p.status === "ACTIVE",
					)
					.reduce((sum, p) => sum + p.amount, 0);
				totalDebt += Math.max(0, loan.totalAmount - paid);
			}
			return { totalDebt, customersWithDebt: pendingLoans.length, overdueLoans: 0 };
		},
	};

	return repo;
}

describe("loans service", () => {
	beforeEach(() => {
		mock.restore();
	});

	afterEach(() => {
		mock.restore();
	});

	test("create assigns the user and generates a disbursement movement", async () => {
		const repository = createInMemoryLoanRepository();
		const service = createLoansService(repository);

		const loan = await service.create("user-a", "business-a", {
			customerId: "customer-a",
			capitalAmount: 100000,
			interestAmount: 20000,
			termCount: 2,
			loanDate: "2026-08-01",
		});

		expect(loan.customerId).toBe("customer-a");
		expect(loan.totalAmount).toBe(120000);
		expect(loan.termCount).toBe(2);
		expect(loan.remainingAmount).toBe(120000);
		expect(loan.dueDate).toBe("2026-09-01");
		expect(repository.disbursementMovements).toHaveLength(1);
		expect(repository.disbursementMovements[0].type).toBe("LOAN_DISBURSEMENT");
		expect(repository.disbursementMovements[0].amount).toBe(100000);
	});

	test("create rejects a customer from another business", async () => {
		const repository = createInMemoryLoanRepository();
		const service = createLoansService(repository);

		await expect(
			service.create("user-a", "business-a", {
				customerId: "customer-b",
				capitalAmount: 100000,
				loanDate: "2026-08-01",
			}),
		).rejects.toThrow("The customer was not found");
	});

	test("getById rejects a loan from another business", async () => {
		const loan = makeLoan({ id: "loan-a", businessId: "business-a" });
		const repository = createInMemoryLoanRepository([loan]);
		const service = createLoansService(repository);

		await expect(
			service.getById("user-a", "loan-a", "business-b"),
		).rejects.toThrow("does not belong to this business");
	});

	test("createPayment rejects when amount exceeds the remaining balance", async () => {
		const loan = makeLoan({ id: "loan-a", totalAmount: 50000 });
		const repository = createInMemoryLoanRepository([loan]);
		const service = createLoansService(repository);

		await expect(
			service.createPayment("user-a", "business-a", "loan-a", {
				amount: 60000,
				paymentDate: "2026-08-05",
			}),
		).rejects.toThrow("exceeds the remaining balance");
	});

	test("createPayment marks the loan as PAID when fully paid", async () => {
		const loan = makeLoan({ id: "loan-a", totalAmount: 50000 });
		const repository = createInMemoryLoanRepository([loan]);
		const service = createLoansService(repository);

		const response = await service.createPayment(
			"user-a",
			"business-a",
			"loan-a",
			{ amount: 50000, paymentDate: "2026-08-05" },
		);

		expect(response.status).toBe("PAID");
		expect(response.paidAmount).toBe(50000);
		expect(response.remainingAmount).toBe(0);
	});

	test("createPayment returns existing payment for an idempotency key", async () => {
		const loan = makeLoan({ id: "loan-a", totalAmount: 50000 });
		const repository = createInMemoryLoanRepository([loan]);
		const service = createLoansService(repository);

		const first = await service.createPayment(
			"user-a",
			"business-a",
			"loan-a",
			{ id: "payment-key", amount: 10000, paymentDate: "2026-08-05" },
		);
		const second = await service.createPayment(
			"user-a",
			"business-a",
			"loan-a",
			{ id: "payment-key", amount: 10000, paymentDate: "2026-08-05" },
		);

		expect(second.payments).toHaveLength(first.payments.length);
	});

	test("cancel rejects a loan with active payments", async () => {
		const loan = makeLoan({ id: "loan-a" });
		const repository = createInMemoryLoanRepository([loan]);
		repository.payments.push(makePayment("loan-a", { amount: 10000 }));
		const service = createLoansService(repository);

		await expect(
			service.cancel("user-a", "loan-a", "business-a", { reason: "Error" }),
		).rejects.toThrow("has active payments");
	});

	test("cancelPayment reverts a PAID loan to PENDING", async () => {
		const loan = makeLoan({
			id: "loan-a",
			totalAmount: 10000,
			status: "PAID",
			paidAt: new Date(),
		});
		const repository = createInMemoryLoanRepository([loan]);
		repository.payments.push(makePayment("loan-a", { id: "payment-a", amount: 10000 }));
		const service = createLoansService(repository);

		const response = await service.cancelPayment(
			"user-a",
			"loan-a",
			"payment-a",
			"business-a",
			{ reason: "Error de caja" },
		);

		expect(response.status).toBe("PENDING");
		expect(response.paidAmount).toBe(0);
	});
});
