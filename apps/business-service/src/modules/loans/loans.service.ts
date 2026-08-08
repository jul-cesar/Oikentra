import type { LoanStatus } from "../../db/schema";
import { AppError } from "../../http/errors";
import { loanRepository, type LoanRepository } from "./loans.repository";
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

function toPaymentResponse(payment: {
	id: string;
	userId: string;
	loanId: string;
	cashMovementId: string;
	amount: number;
	paymentDate: string;
	note: string | null;
	status: string;
	cancellationReason: string | null;
	cancelledAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}): LoanPaymentResponse {
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

function generateInstallments(
	loanId: string,
	totalAmount: number,
	termCount: number,
	loanDate: string,
	dueDate?: string,
): { id: string; loanId: string; number: number; dueDate: string; amount: number }[] {
	if (termCount <= 1) {
		return [
			{
				id: crypto.randomUUID(),
				loanId,
				number: 1,
				dueDate: dueDate ?? loanDate,
				amount: totalAmount,
			},
		];
	}

	const base = Math.floor(totalAmount / termCount);
	let remainder = totalAmount - base * termCount;
	const installments: {
		id: string;
		loanId: string;
		number: number;
		dueDate: string;
		amount: number;
	}[] = [];
	const due = new Date(`${loanDate}T00:00:00Z`);
	for (let index = 0; index < termCount; index += 1) {
		const amount = base + (remainder > 0 ? 1 : 0);
		if (remainder > 0) remainder -= 1;
		installments.push({
			id: crypto.randomUUID(),
			loanId,
			number: index + 1,
			dueDate: due.toISOString().slice(0, 10),
			amount,
		});
		due.setMonth(due.getMonth() + 1);
	}
	return installments;
}

export function createLoansService(
	repository: LoanRepository = loanRepository,
) {
	return {
		async create(userId: string, businessId: string, input: CreateLoanInput) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.loansCreate,
			);

			const customer = await customerRepository.findByIdAndBusiness(
				input.customerId,
				businessId,
			);
			if (!customer) {
				throw new AppError(
					"CUSTOMER_NOT_FOUND",
					404,
					"The customer was not found in this business.",
				);
			}

			const interestAmount = input.interestAmount ?? 0;
			const termCount = input.termCount ?? 1;
			const totalAmount = input.capitalAmount + interestAmount;
			const now = new Date();
			const loanId = crypto.randomUUID();
			const installments = generateInstallments(
				loanId,
				totalAmount,
				termCount,
				input.loanDate,
				input.dueDate,
			);
			const loanDueDate = input.dueDate ?? installments.at(-1)!.dueDate;

			const { loan, installments: savedInstallments } =
				await repository.createLoan(
					{
						id: loanId,
						userId,
						businessId,
						customerId: input.customerId,
						capitalAmount: input.capitalAmount,
						interestAmount,
						totalAmount,
						termCount,
						description: input.description ?? null,
						loanDate: input.loanDate,
						dueDate: loanDueDate,
						status: "PENDING",
						version: 1,
						createdAt: now,
						updatedAt: now,
					},
					installments.map((installment) => ({
						...installment,
						createdAt: now,
						updatedAt: now,
					})),
					{
						id: crypto.randomUUID(),
						userId,
						businessId,
						type: "LOAN_DISBURSEMENT",
						amount: input.capitalAmount,
						category: null,
						paymentMethod: null,
						note: input.description ?? null,
						businessDate: input.loanDate,
						occurredAt: now,
						status: "ACTIVE",
						sourceType: "LOAN_DISBURSEMENT",
						sourceId: loanId,
						version: 1,
						createdAt: now,
						updatedAt: now,
					},
				);

			return toLoanResponse(
				loan,
				savedInstallments,
				await repository.findPaymentsByLoanId(loanId),
				0,
			);
		},

		async summary(userId: string, businessId: string) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.loansRead,
			);
			return repository.getBusinessLoanSummary(businessId);
		},

		async list(
			userId: string,
			businessId: string,
			filters?: {
				customerId?: string;
				status?: LoanStatus;
				from?: string;
				to?: string;
				limit?: number;
				cursor?: string;
			},
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.loansRead,
			);

			const loanRecords = await repository.findLoansByBusiness(
				businessId,
				filters,
			);

			return Promise.all(
				loanRecords.map(async (loan) => {
					const payments = await repository.findPaymentsByLoanId(loan.id);
					const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
					return toLoanResponse(
						loan,
						await repository.findInstallmentsByLoanId(loan.id),
						payments,
						totalPaid,
					);
				}),
			);
		},

		async getById(userId: string, loanId: string, businessId: string) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.loansRead,
			);

			const loan = await repository.findLoanById(loanId);
			if (!loan) {
				throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			}
			if (loan.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The loan does not belong to this business.",
				);
			}

			const payments = await repository.findPaymentsByLoanId(loanId);
			const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
			return toLoanResponse(
				loan,
				await repository.findInstallmentsByLoanId(loanId),
				payments,
				totalPaid,
			);
		},

		async createPayment(
			userId: string,
			businessId: string,
			loanId: string,
			input: CreateLoanPaymentInput,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.paymentsCreate,
			);

			const loan = await repository.findLoanById(loanId);
			if (!loan) {
				throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			}
			if (loan.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The loan does not belong to this business.",
				);
			}

			if (input.id) {
				const existingPayment = await repository.findPaymentById(input.id);
				if (existingPayment) {
					if (
						existingPayment.userId !== userId ||
						existingPayment.businessId !== businessId ||
						existingPayment.loanId !== loanId
					) {
						throw new AppError(
							"IDEMPOTENCY_KEY_REUSED",
							409,
							"The payment id is already in use.",
						);
					}

					const payments = await repository.findPaymentsByLoanId(loanId);
					const totalPaid = await repository.getLoanTotalPaid(loanId);
					return toLoanResponse(
						loan,
						await repository.findInstallmentsByLoanId(loanId),
						payments,
						totalPaid,
					);
				}
			}

			if (loan.status !== "PENDING") {
				throw new AppError(
					"LOAN_NOT_PENDING",
					400,
					"The loan is not pending.",
				);
			}

			const currentPaid = await repository.getLoanTotalPaid(loanId);
			const remaining = loan.totalAmount - currentPaid;

			if (input.amount > remaining) {
				throw new AppError(
					"PAYMENT_EXCEEDS_BALANCE",
					400,
					`The payment exceeds the remaining balance of ${remaining}.`,
				);
			}

			const now = new Date();
			const paymentId = input.id ?? crypto.randomUUID();
			await repository.createPayment(
				{
					id: paymentId,
					userId,
					businessId,
					loanId,
					customerId: loan.customerId,
					amount: input.amount,
					paymentDate: input.paymentDate,
					note: input.note ?? null,
					status: "ACTIVE",
				},
				{
					id: crypto.randomUUID(),
					userId,
					businessId,
					type: "LOAN_PAYMENT",
					amount: input.amount,
					category: null,
					paymentMethod: null,
					note: input.note ?? null,
					businessDate: input.paymentDate,
					occurredAt: now,
					status: "ACTIVE",
					sourceType: "LOAN_PAYMENT",
					sourceId: paymentId,
					version: 1,
					createdAt: now,
					updatedAt: now,
				},
			);

			const totalPaid = await repository.getLoanTotalPaid(loanId);

			if (totalPaid >= loan.totalAmount) {
				await repository.updateLoanStatus(loanId, "PAID", new Date());
			}

			const payments = await repository.findPaymentsByLoanId(loanId);
			const updatedLoan =
				(await repository.findLoanById(loanId)) ?? loan;
			return toLoanResponse(
				updatedLoan,
				await repository.findInstallmentsByLoanId(loanId),
				payments,
				totalPaid,
			);
		},

		async listPayments(userId: string, loanId: string, businessId: string) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.loansRead,
			);

			const loan = await repository.findLoanById(loanId);
			if (!loan) {
				throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			}
			if (loan.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The loan does not belong to this business.",
				);
			}

			const payments = await repository.findPaymentsByLoanId(loanId);
			return payments.map(toPaymentResponse);
		},

		async cancelPayment(
			userId: string,
			loanId: string,
			paymentId: string,
			businessId: string,
			input: CancelLoanPaymentInput,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.paymentsCancel,
			);

			const loan = await repository.findLoanById(loanId);
			if (!loan) {
				throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			}
			if (loan.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The loan does not belong to this business.",
				);
			}

			const payment = await repository.findPaymentByIdAndLoan(
				paymentId,
				loanId,
			);
			if (!payment) {
				throw new AppError(
					"PAYMENT_NOT_FOUND",
					404,
					"The payment was not found.",
				);
			}
			if (payment.status !== "ACTIVE") {
				throw new AppError(
					"ALREADY_CANCELLED",
					400,
					"The payment is already cancelled.",
				);
			}

			await repository.cancelPayment(paymentId, loanId, input.reason);

			const totalPaid = await repository.getLoanTotalPaid(loanId);

			if (loan.status === "PAID" && totalPaid < loan.totalAmount) {
				await repository.updateLoanStatus(loanId, "PENDING", new Date());
			}

			const updatedLoan =
				(await repository.findLoanById(loanId)) ?? loan;
			return toLoanResponse(
				updatedLoan,
				await repository.findInstallmentsByLoanId(loanId),
				await repository.findPaymentsByLoanId(loanId),
				totalPaid,
			);
		},

		async cancel(
			userId: string,
			loanId: string,
			businessId: string,
			input: CancelLoanInput,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.loansCancel,
			);

			const loan = await repository.findLoanById(loanId);
			if (!loan) {
				throw new AppError("LOAN_NOT_FOUND", 404, "The loan was not found.");
			}
			if (loan.status !== "PENDING") {
				throw new AppError(
					"LOAN_NOT_PENDING",
					400,
					"The loan cannot be cancelled.",
				);
			}
			if (loan.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The loan does not belong to this business.",
				);
			}

			const activePayments = await repository.findPaymentsByLoanId(loanId);
			if (activePayments.length > 0) {
				throw new AppError(
					"LOAN_HAS_ACTIVE_PAYMENTS",
					400,
					"The loan has active payments and cannot be cancelled.",
				);
			}

			const cancelled = await repository.cancelLoan(loanId, input.reason);
			if (!cancelled) {
				throw new AppError(
					"CANCEL_FAILED",
					409,
					"Could not cancel the loan.",
				);
			}

			return toLoanResponse(
				cancelled,
				await repository.findInstallmentsByLoanId(loanId),
				[],
				0,
			);
		},
	};
}

function toLoanResponse(
	loan: {
		id: string;
		userId: string;
		customerId: string;
		capitalAmount: number;
		interestAmount: number;
		totalAmount: number;
		termCount: number;
		description: string | null;
		loanDate: string;
		dueDate: string;
		status: string;
		cancellationReason: string | null;
		cancelledAt: Date | null;
		paidAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
	},
	installments: {
		id: string;
		number: number;
		dueDate: string;
		amount: number;
	}[],
	payments: {
		id: string;
		userId: string;
		loanId: string;
		cashMovementId: string;
		amount: number;
		paymentDate: string;
		note: string | null;
		status: string;
		cancellationReason: string | null;
		cancelledAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
	}[],
	totalPaid: number,
): LoanResponse {
	return {
		id: loan.id,
		userId: loan.userId,
		customerId: loan.customerId,
		capitalAmount: loan.capitalAmount,
		interestAmount: loan.interestAmount,
		totalAmount: loan.totalAmount,
		paidAmount: totalPaid,
		remainingAmount: Math.max(0, loan.totalAmount - totalPaid),
		termCount: loan.termCount,
		description: loan.description,
		loanDate: loan.loanDate,
		dueDate: loan.dueDate,
		status: loan.status,
		cancellationReason: loan.cancellationReason,
		cancelledAt: loan.cancelledAt?.toISOString() ?? null,
		paidAt: loan.paidAt?.toISOString() ?? null,
		installments: installments.map((installment) => ({
			id: installment.id,
			number: installment.number,
			dueDate: installment.dueDate,
			amount: installment.amount,
		})),
		payments: payments.map(toPaymentResponse),
		createdAt: loan.createdAt.toISOString(),
		updatedAt: loan.updatedAt.toISOString(),
	};
}

export const loansService = createLoansService();
