import type { CreditStatus } from "../../db/schema";
import { AppError } from "../../http/errors";
import { creditRepository, type CreditRepository } from "./credits.repository";
import { membersService, permissions } from "../businesses/members.service";
import { customerRepository } from "../customers/customers.repository";
import type {
	CreditResponse,
	CreditPaymentResponse,
	CreateCreditInput,
	CreateCreditPaymentInput,
	CancelCreditInput,
	CancelPaymentInput,
} from "./types/credits.types";

function toPaymentResponse(payment: {
	id: string;
	userId: string;
	creditId: string;
	cashMovementId: string;
	amount: number;
	paymentDate: string;
	note: string | null;
	status: string;
	cancellationReason: string | null;
	cancelledAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}): CreditPaymentResponse {
	return {
		id: payment.id,
		userId: payment.userId,
		creditId: payment.creditId,
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

export function createCreditsService(
	repository: CreditRepository = creditRepository,
) {
	return {
		async create(userId: string, businessId: string, input: CreateCreditInput) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.creditsCreate,
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

			const now = new Date();
			const creditId = crypto.randomUUID();
			const { credit } = await repository.createCredit(
				{
					id: creditId,
					userId,
					businessId,
					customerId: input.customerId,
					originalAmount: input.originalAmount,
					description: input.description ?? null,
					creditDate: input.creditDate,
					dueDate: input.dueDate ?? null,
					status: "PENDING",
					version: 1,
					createdAt: now,
					updatedAt: now,
				},
				{
					id: crypto.randomUUID(),
					userId,
					businessId,
					customerId: input.customerId,
					type: "CREDIT_DISBURSEMENT",
					amount: input.originalAmount,
					note: input.description ?? null,
					businessDate: input.creditDate,
					occurredAt: now,
					status: "ACTIVE",
					sourceType: "CREDIT_DISBURSEMENT",
					sourceId: creditId,
					version: 1,
					createdAt: now,
					updatedAt: now,
				},
			);

			return toCreditResponse(credit, [], 0);
		},

		async summary(userId: string, businessId: string) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.creditsRead,
			);
			return repository.getBusinessDebtSummary(businessId);
		},

		async list(
			userId: string,
			businessId: string,
			filters?: {
				customerId?: string;
				status?: CreditStatus;
				from?: string;
				to?: string;
				limit?: number;
				cursor?: string;
			},
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.creditsRead,
			);

			const creditRecords = await repository.findCreditsByBusiness(
				businessId,
				filters,
			);

			return Promise.all(
				creditRecords.map(async (credit) => {
					const payments = await repository.findPaymentsByCreditId(credit.id);
					const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
					return toCreditResponse(credit, payments, totalPaid);
				}),
			);
		},

		async getById(userId: string, creditId: string, businessId: string) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.creditsRead,
			);

			const credit = await repository.findCreditById(creditId);
			if (!credit) {
				throw new AppError(
					"CREDIT_NOT_FOUND",
					404,
					"The credit was not found.",
				);
			}
			if (credit.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The credit does not belong to this business.",
				);
			}

			const payments = await repository.findPaymentsByCreditId(creditId);
			const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
			return toCreditResponse(credit, payments, totalPaid);
		},

		async createPayment(
			userId: string,
			businessId: string,
			creditId: string,
			input: CreateCreditPaymentInput,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.paymentsCreate,
			);

			const credit = await repository.findCreditById(creditId);
			if (!credit) {
				throw new AppError(
					"CREDIT_NOT_FOUND",
					404,
					"The credit was not found.",
				);
			}
			if (credit.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The credit does not belong to this business.",
				);
			}

			if (input.id) {
				const existingPayment = await repository.findPaymentById(input.id);
				if (existingPayment) {
					if (
						existingPayment.userId !== userId ||
						existingPayment.businessId !== businessId ||
						existingPayment.creditId !== creditId
					) {
						throw new AppError(
							"IDEMPOTENCY_KEY_REUSED",
							409,
							"The payment id is already in use.",
						);
					}

					const payments = await repository.findPaymentsByCreditId(creditId);
					const totalPaid = await repository.getCreditTotalPaid(creditId);
					return toCreditResponse(credit, payments, totalPaid);
				}
			}

			if (credit.status !== "PENDING") {
				throw new AppError(
					"CREDIT_NOT_PENDING",
					400,
					"The credit is not pending.",
				);
			}

			const currentPaid = await repository.getCreditTotalPaid(creditId);
			const remaining = credit.originalAmount - currentPaid;

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
					creditId,
					customerId: credit.customerId,
					amount: input.amount,
					paymentDate: input.paymentDate,
					note: input.note ?? null,
					status: "ACTIVE",
				},
				{
					id: crypto.randomUUID(),
					userId,
					businessId,
					customerId: credit.customerId,
					type: "CREDIT_PAYMENT",
					amount: input.amount,
					note: input.note ?? null,
					businessDate: input.paymentDate,
					occurredAt: now,
					status: "ACTIVE",
					sourceType: "CREDIT_PAYMENT",
					sourceId: paymentId,
					version: 1,
					createdAt: now,
					updatedAt: now,
				},
			);

			const totalPaid = await repository.getCreditTotalPaid(creditId);

			if (totalPaid >= credit.originalAmount) {
				await repository.updateCreditStatus(creditId, "PAID", new Date());
			}

			const allPayments = await repository.findPaymentsByCreditId(creditId);
			return toCreditResponse(credit, allPayments, totalPaid);
		},

		async listPayments(userId: string, creditId: string, businessId: string) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.creditsRead,
			);

			const credit = await repository.findCreditById(creditId);
			if (!credit) {
				throw new AppError(
					"CREDIT_NOT_FOUND",
					404,
					"The credit was not found.",
				);
			}
			if (credit.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The credit does not belong to this business.",
				);
			}

			const payments = await repository.findPaymentsByCreditId(creditId);
			return payments.map(toPaymentResponse);
		},

		async cancelPayment(
			userId: string,
			creditId: string,
			paymentId: string,
			businessId: string,
			input: CancelPaymentInput,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.paymentsCancel,
			);

			const credit = await repository.findCreditById(creditId);
			if (!credit) {
				throw new AppError(
					"CREDIT_NOT_FOUND",
					404,
					"The credit was not found.",
				);
			}
			if (credit.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The credit does not belong to this business.",
				);
			}

			const payment = await repository.findPaymentByIdAndCredit(
				paymentId,
				creditId,
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

			await repository.cancelPayment(paymentId, creditId, input.reason);

			const totalPaid = await repository.getCreditTotalPaid(creditId);

			// If the credit was PAID and now totalPaid < originalAmount, revert to PENDING
			if (credit.status === "PAID" && totalPaid < credit.originalAmount) {
				await repository.updateCreditStatus(creditId, "PENDING", new Date());
			}

			return toCreditResponse(
				credit,
				await repository.findPaymentsByCreditId(creditId),
				totalPaid,
			);
		},

		async cancel(
			userId: string,
			creditId: string,
			businessId: string,
			input: CancelCreditInput,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.creditsCancel,
			);

			const credit = await repository.findCreditById(creditId);
			if (!credit) {
				throw new AppError(
					"CREDIT_NOT_FOUND",
					404,
					"The credit was not found.",
				);
			}
			if (credit.status !== "PENDING") {
				throw new AppError(
					"CREDIT_NOT_PENDING",
					400,
					"The credit cannot be cancelled.",
				);
			}
			if (credit.businessId !== businessId) {
				throw new AppError(
					"BUSINESS_ACCESS_DENIED",
					403,
					"The credit does not belong to this business.",
				);
			}

			// Check if it has active payments
			const activePayments = await repository.findPaymentsByCreditId(creditId);
			if (activePayments.length > 0) {
				throw new AppError(
					"CREDIT_HAS_ACTIVE_PAYMENTS",
					400,
					"The credit has active payments and cannot be cancelled.",
				);
			}

			const cancelled = await repository.cancelCredit(creditId, input.reason);
			if (!cancelled) {
				throw new AppError(
					"CANCEL_FAILED",
					409,
					"Could not cancel the credit.",
				);
			}

			const payments = await repository.findPaymentsByCreditId(creditId);
			const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
			return toCreditResponse(cancelled, payments, totalPaid);
		},
	};
}

function toCreditResponse(
	credit: {
		id: string;
		userId: string;
		customerId: string;
		originalAmount: number;
		description: string | null;
		creditDate: string;
		dueDate: string | null;
		status: string;
		cancellationReason: string | null;
		cancelledAt: Date | null;
		paidAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
	},
	payments: {
		id: string;
		userId: string;
		creditId: string;
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
): CreditResponse {
	return {
		id: credit.id,
		userId: credit.userId,
		customerId: credit.customerId,
		originalAmount: credit.originalAmount,
		paidAmount: totalPaid,
		remainingAmount: Math.max(0, credit.originalAmount - totalPaid),
		description: credit.description,
		creditDate: credit.creditDate,
		dueDate: credit.dueDate,
		status: credit.status,
		cancellationReason: credit.cancellationReason,
		cancelledAt: credit.cancelledAt?.toISOString() ?? null,
		paidAt: credit.paidAt?.toISOString() ?? null,
		payments: payments.map(toPaymentResponse),
		createdAt: credit.createdAt.toISOString(),
		updatedAt: credit.updatedAt.toISOString(),
	};
}

export const creditsService = createCreditsService();
