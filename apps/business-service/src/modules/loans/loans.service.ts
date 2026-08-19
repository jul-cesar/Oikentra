import type {
	Loan,
	LoanFrequency,
	LoanInstallment,
	LoanInstallmentStatus,
	LoanPayment,
	LoanStatus,
} from "../../db/schema";
import { AppError } from "../../http/errors";
import {
	loanRepository,
	type InstallmentPaymentUpdate,
	type LoanRepository,
} from "./loans.repository";
import { membersService, permissions } from "../businesses/members.service";
import { customerRepository } from "../customers/customers.repository";
import type {
	CancelLoanInput,
	CancelLoanPaymentInput,
	CreateLoanInput,
	CreateLoanPaymentInput,
	LoanPaymentResponse,
	LoanResponse,
} from "./types/loans.types";

const DAY_MS = 86_400_000;

function roundMoney(value: number) {
	return Math.round(value);
}

function addFrequency(date: string, frequency: LoanFrequency) {
	const next = new Date(`${date}T00:00:00.000Z`);
	if (frequency === "DAILY") next.setUTCDate(next.getUTCDate() + 1);
	if (frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
	if (frequency === "BIWEEKLY") next.setUTCDate(next.getUTCDate() + 15);
	if (frequency === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + 1);
	return next.toISOString().slice(0, 10);
}

function periodicRate(monthlyRate: number, frequency: LoanFrequency) {
	const monthlyDecimal = monthlyRate / 100;
	if (frequency === "DAILY") return monthlyDecimal / 30;
	if (frequency === "WEEKLY") return monthlyDecimal / 4;
	if (frequency === "BIWEEKLY") return monthlyDecimal / 2;
	return monthlyDecimal;
}

function calculateInstallments(
	loanId: string,
	amount: number,
	interestRate: number,
	frequency: LoanFrequency,
	termCount: number,
	startDate: string,
) {
	const rate = periodicRate(interestRate, frequency);
	const factor = (1 + rate) ** termCount;
	const rawInstallment = rate === 0 ? amount / termCount : amount * ((rate * factor) / (factor - 1));
	const installmentAmount = roundMoney(rawInstallment);
	let balance = amount;
	let dueDate = startDate;
	let totalInterest = 0;
	const installments = [] as Array<{
		id: string;
		loanId: string;
		number: number;
		dueDate: string;
		principalAmount: number;
		interestAmount: number;
		totalAmount: number;
		paidAmount: number;
		status: "PENDING";
	}>;

	for (let number = 1; number <= termCount; number += 1) {
		dueDate = addFrequency(dueDate, frequency);
		const interestAmount = roundMoney(balance * rate);
		const principalAmount = number === termCount
			? balance
			: Math.min(balance, roundMoney(rawInstallment - interestAmount));
		const totalAmount = principalAmount + interestAmount;
		balance -= principalAmount;
		totalInterest += interestAmount;
		installments.push({
			id: crypto.randomUUID(),
			loanId,
			number,
			dueDate,
			principalAmount,
			interestAmount,
			totalAmount,
			paidAmount: 0,
			status: "PENDING",
		});
	}

	return { installments, installmentAmount, totalInterest };
}

function isOverdue(dueDate: string, reference = new Date()) {
	return new Date(`${dueDate}T00:00:00.000Z`).getTime() <
		Math.floor(reference.getTime() / DAY_MS) * DAY_MS;
}

function installmentStatus(
	installment: Pick<LoanInstallment, "dueDate" | "totalAmount" | "paidAmount">,
	reference?: Date,
): LoanInstallmentStatus {
	if (installment.paidAmount >= installment.totalAmount) return "PAID";
	if (isOverdue(installment.dueDate, reference)) return "OVERDUE";
	if (installment.paidAmount > 0) return "PARTIAL";
	return "PENDING";
}

function allocatePayment(
	installments: LoanInstallment[],
	amount: number,
	reference?: Date,
): InstallmentPaymentUpdate[] {
	let available = amount;
	return installments.map((installment) => {
		const owed = Math.max(0, installment.totalAmount - installment.paidAmount);
		const applied = Math.min(available, owed);
		available -= applied;
		const paidAmount = installment.paidAmount + applied;
		return {
			id: installment.id,
			paidAmount,
			status: installmentStatus({ ...installment, paidAmount }, reference),
		};
	});
}

function replayPayments(installments: LoanInstallment[], payments: LoanPayment[]) {
	let recalculated = installments.map((installment) => ({ ...installment, paidAmount: 0 }));
	for (const payment of [...payments].sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))) {
		const updates = allocatePayment(recalculated, payment.amount);
		recalculated = recalculated.map((installment, index) => ({
			...installment,
			paidAmount: updates[index]!.paidAmount,
		}));
	}
	return allocatePayment(recalculated, 0);
}

function toPaymentResponse(payment: LoanPayment): LoanPaymentResponse {
	return {
		id: payment.id,
		userId: payment.userId,
		loanId: payment.loanId,
		cashMovementId: payment.cashMovementId,
		amount: payment.amount,
		paymentDate: payment.paymentDate,
		note: payment.note,
		status: payment.status,
		cancellationReason: payment.cancellationReason,
		cancelledAt: payment.cancelledAt?.toISOString() ?? null,
		createdAt: payment.createdAt.toISOString(),
		updatedAt: payment.updatedAt.toISOString(),
	};
}

function toLoanResponse(loan: Loan, installments: LoanInstallment[], payments: LoanPayment[]): LoanResponse {
	const paidAmount = installments.reduce((total, installment) => total + installment.paidAmount, 0);
	const totalAmount = installments.reduce((total, installment) => total + installment.totalAmount, 0);
	return {
		id: loan.id,
		userId: loan.userId,
		customerId: loan.customerId,
		capitalAmount: loan.capitalAmount,
		interestRate: loan.interestRate,
		frequency: loan.frequency,
		installmentAmount: loan.installmentAmount,
		interestAmount: loan.interestAmount,
		totalAmount,
		paidAmount,
		remainingAmount: Math.max(0, totalAmount - paidAmount),
		termCount: loan.termCount,
		description: loan.description,
		startDate: loan.loanDate,
		dueDate: loan.dueDate,
		status: loan.status,
		cancellationReason: loan.cancellationReason,
		cancelledAt: loan.cancelledAt?.toISOString() ?? null,
		paidAt: loan.paidAt?.toISOString() ?? null,
		installments: installments.map((installment) => ({
			id: installment.id,
			number: installment.number,
			dueDate: installment.dueDate,
			principalAmount: installment.principalAmount,
			interestAmount: installment.interestAmount,
			totalAmount: installment.totalAmount,
			paidAmount: installment.paidAmount,
			status: installmentStatus(installment),
		})),
		payments: payments.map(toPaymentResponse),
		createdAt: loan.createdAt.toISOString(),
		updatedAt: loan.updatedAt.toISOString(),
	};
}

export function createLoansService(repository: LoanRepository = loanRepository) {
	return {
		async create(userId: string, businessId: string, input: CreateLoanInput) {
			await membersService.requirePermission(userId, businessId, permissions.loansCreate);
			const customer = await customerRepository.findByIdAndBusiness(input.customerId, businessId);
			if (!customer) throw new AppError("CUSTOMER_NOT_FOUND", 404, "The customer was not found in this business.");

			const now = new Date();
			const loanId = crypto.randomUUID();
			const schedule = calculateInstallments(loanId, input.capitalAmount, input.interestRate, input.frequency, input.termCount, input.startDate);
			const loanDueDate = schedule.installments.at(-1)!.dueDate;
			const { loan, installments } = await repository.createLoan(
				{
					id: loanId,
					userId,
					businessId,
					customerId: input.customerId,
					capitalAmount: input.capitalAmount,
					interestRate: input.interestRate,
					frequency: input.frequency,
					installmentAmount: schedule.installmentAmount,
					interestAmount: schedule.totalInterest,
					totalAmount: schedule.installments.reduce((sum, item) => sum + item.totalAmount, 0),
					termCount: input.termCount,
					description: input.description ?? null,
					loanDate: input.startDate,
					dueDate: loanDueDate,
					status: "ACTIVE",
					version: 1,
					createdAt: now,
					updatedAt: now,
				},
				schedule.installments.map((installment) => ({ ...installment, version: 1, createdAt: now, updatedAt: now })),
				{
					id: crypto.randomUUID(), userId, businessId, customerId: input.customerId,
					type: "LOAN_DISBURSEMENT", amount: input.capitalAmount, note: input.description ?? null,
					businessDate: input.startDate, occurredAt: now, status: "ACTIVE",
					sourceType: "LOAN_DISBURSEMENT", sourceId: loanId, version: 1, createdAt: now, updatedAt: now,
				},
			);
			return toLoanResponse(loan, installments, []);
		},

		async summary(userId: string, businessId: string) {
			await membersService.requirePermission(userId, businessId, permissions.loansRead);
			return repository.getBusinessLoanSummary(businessId);
		},

		async list(userId: string, businessId: string, filters?: { customerId?: string; status?: LoanStatus; from?: string; to?: string; limit?: number; cursor?: string }) {
			await membersService.requirePermission(userId, businessId, permissions.loansRead);
			const records = await repository.findLoansByBusiness(businessId, filters);
			return Promise.all(records.map(async (loan) => toLoanResponse(loan, await repository.findInstallmentsByLoanId(loan.id), await repository.findPaymentsByLoanId(loan.id))));
		},

		async getById(userId: string, loanId: string, businessId: string) {
			await membersService.requirePermission(userId, businessId, permissions.loansRead);
			const loan = await repository.findLoanById(loanId);
			if (!loan) throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			if (loan.businessId !== businessId) throw new AppError("BUSINESS_ACCESS_DENIED", 403, "The loan does not belong to this business.");
			return toLoanResponse(loan, await repository.findInstallmentsByLoanId(loanId), await repository.findPaymentsByLoanId(loanId));
		},

		async createPayment(userId: string, businessId: string, loanId: string, input: CreateLoanPaymentInput) {
			await membersService.requirePermission(userId, businessId, permissions.paymentsCreate);
			const loan = await repository.findLoanById(loanId);
			if (!loan) throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			if (loan.businessId !== businessId) throw new AppError("BUSINESS_ACCESS_DENIED", 403, "The loan does not belong to this business.");
			if (loan.status !== "ACTIVE") throw new AppError("LOAN_NOT_ACTIVE", 400, "The loan is not active.");

			if (input.id) {
				const existing = await repository.findPaymentById(input.id);
				if (existing) {
					if (existing.userId !== userId || existing.businessId !== businessId || existing.loanId !== loanId) throw new AppError("IDEMPOTENCY_KEY_REUSED", 409, "The payment id is already in use.");
					return toLoanResponse(loan, await repository.findInstallmentsByLoanId(loanId), await repository.findPaymentsByLoanId(loanId));
				}
			}

			const installments = await repository.findInstallmentsByLoanId(loanId);
			const remaining = installments.reduce((sum, installment) => sum + Math.max(0, installment.totalAmount - installment.paidAmount), 0);
			if (input.amount > remaining) throw new AppError("PAYMENT_EXCEEDS_BALANCE", 400, `The payment exceeds the remaining balance of ${remaining}.`);
			const updates = allocatePayment(installments, input.amount);
			const now = new Date();
			const paymentId = input.id ?? crypto.randomUUID();
			await repository.createPayment(
				{ id: paymentId, userId, businessId, loanId, customerId: loan.customerId, amount: input.amount, paymentDate: input.paymentDate, note: input.note ?? null, status: "ACTIVE", version: 1, cancellationReason: null, cancelledAt: null },
				{ id: crypto.randomUUID(), userId, businessId, customerId: loan.customerId, type: "LOAN_PAYMENT", amount: input.amount, note: input.note ?? null, businessDate: input.paymentDate, occurredAt: now, status: "ACTIVE", sourceType: "LOAN_PAYMENT", sourceId: paymentId, version: 1, createdAt: now, updatedAt: now },
				updates,
			);
			const updatedInstallments = await repository.findInstallmentsByLoanId(loanId);
			if (updatedInstallments.every((installment) => installment.paidAmount >= installment.totalAmount)) await repository.updateLoanStatus(loanId, "PAID", new Date());
			const updatedLoan = (await repository.findLoanById(loanId)) ?? loan;
			return toLoanResponse(updatedLoan, await repository.findInstallmentsByLoanId(loanId), await repository.findPaymentsByLoanId(loanId));
		},

		async listPayments(userId: string, loanId: string, businessId: string) {
			await membersService.requirePermission(userId, businessId, permissions.loansRead);
			const loan = await repository.findLoanById(loanId);
			if (!loan) throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			if (loan.businessId !== businessId) throw new AppError("BUSINESS_ACCESS_DENIED", 403, "The loan does not belong to this business.");
			return (await repository.findPaymentsByLoanId(loanId)).map(toPaymentResponse);
		},

		async cancelPayment(userId: string, loanId: string, paymentId: string, businessId: string, input: CancelLoanPaymentInput) {
			await membersService.requirePermission(userId, businessId, permissions.paymentsCancel);
			const loan = await repository.findLoanById(loanId);
			if (!loan) throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			if (loan.businessId !== businessId) throw new AppError("BUSINESS_ACCESS_DENIED", 403, "The loan does not belong to this business.");
			const payment = await repository.findPaymentByIdAndLoan(paymentId, loanId);
			if (!payment) throw new AppError("PAYMENT_NOT_FOUND", 404, "The payment was not found.");
			if (payment.status !== "ACTIVE") throw new AppError("ALREADY_CANCELLED", 400, "The payment is already cancelled.");
			const installments = await repository.findInstallmentsByLoanId(loanId);
			const activePayments = (await repository.findPaymentsByLoanId(loanId)).filter((item) => item.id !== paymentId);
			await repository.cancelPayment(paymentId, loanId, input.reason, replayPayments(installments, activePayments));
			await repository.updateLoanStatus(loanId, "ACTIVE", new Date());
			const updatedLoan = (await repository.findLoanById(loanId)) ?? loan;
			return toLoanResponse(updatedLoan, await repository.findInstallmentsByLoanId(loanId), await repository.findPaymentsByLoanId(loanId));
		},

		async cancel(userId: string, loanId: string, businessId: string, input: CancelLoanInput) {
			await membersService.requirePermission(userId, businessId, permissions.loansCancel);
			const loan = await repository.findLoanById(loanId);
			if (!loan) throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			if (loan.businessId !== businessId) throw new AppError("BUSINESS_ACCESS_DENIED", 403, "The loan does not belong to this business.");
			if (loan.status !== "ACTIVE") throw new AppError("LOAN_NOT_ACTIVE", 400, "The loan cannot be cancelled.");
			if ((await repository.findPaymentsByLoanId(loanId)).length) throw new AppError("LOAN_HAS_ACTIVE_PAYMENTS", 400, "The loan has active payments and cannot be cancelled.");
			const cancelled = await repository.cancelLoan(loanId, input.reason);
			if (!cancelled) throw new AppError("CANCEL_FAILED", 409, "Could not cancel the loan.");
			return toLoanResponse(cancelled, await repository.findInstallmentsByLoanId(loanId), []);
		},
	};
}

export const loansService = createLoansService();
