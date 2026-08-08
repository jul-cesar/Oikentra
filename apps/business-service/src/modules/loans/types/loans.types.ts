import type { z } from "zod";
import type {
	cancelLoanPaymentSchema,
	cancelLoanSchema,
	createLoanPaymentSchema,
	createLoanSchema,
} from "../loans.schemas";

export type CreateLoanInput = z.input<typeof createLoanSchema>;
export type CreateLoanPaymentInput = z.infer<typeof createLoanPaymentSchema>;
export type CancelLoanInput = z.infer<typeof cancelLoanSchema>;
export type CancelLoanPaymentInput = z.infer<typeof cancelLoanPaymentSchema>;

export type LoanInstallmentResponse = {
	id: string;
	number: number;
	dueDate: string;
	amount: number;
};

export type LoanPaymentResponse = {
	id: string;
	userId: string;
	loanId: string;
	cashMovementId: string;
	amount: number;
	paymentDate: string;
	note: string | null;
	status: string;
	cancellationReason: string | null;
	cancelledAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type LoanResponse = {
	id: string;
	userId: string;
	customerId: string;
	capitalAmount: number;
	interestAmount: number;
	totalAmount: number;
	paidAmount: number;
	remainingAmount: number;
	termCount: number;
	description: string | null;
	loanDate: string;
	dueDate: string;
	status: string;
	cancellationReason: string | null;
	cancelledAt: string | null;
	paidAt: string | null;
	installments: LoanInstallmentResponse[];
	payments: LoanPaymentResponse[];
	createdAt: string;
	updatedAt: string;
};

export type LoanSummaryResponse = {
	totalDebt: number;
	customersWithDebt: number;
	overdueLoans: number;
};
