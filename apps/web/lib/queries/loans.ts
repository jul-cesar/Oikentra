import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	cancelLoan,
	cancelLoanPayment,
	createLoan,
	createLoanPayment,
	getLoan,
	getLoanPayments,
	getLoanSummary,
	getLoans,
	type Loan,
} from "@/lib/loans-api";

export const loansQueryKeys = {
	loans: (businessId: string, status?: Loan["status"]) =>
		["loans", businessId, status ?? "all"] as const,
	loan: (businessId: string, loanId: string) =>
		["loan", businessId, loanId] as const,
	payments: (businessId: string, loanId: string) =>
		["loan-payments", businessId, loanId] as const,
	summary: (businessId: string) => ["loans-summary", businessId] as const,
};

export function useLoans(businessId: string, status?: Loan["status"]) {
	return useQuery({
		queryKey: loansQueryKeys.loans(businessId, status),
		queryFn: () => getLoans(businessId, status),
		enabled: Boolean(businessId),
	});
}

export function useLoan(businessId: string, loanId: string | null) {
	return useQuery({
		queryKey: loansQueryKeys.loan(businessId, loanId ?? ""),
		queryFn: () => getLoan(businessId, loanId!),
		enabled: Boolean(businessId && loanId),
	});
}

export function useLoanPayments(businessId: string, loanId: string | null) {
	return useQuery({
		queryKey: loansQueryKeys.payments(businessId, loanId ?? ""),
		queryFn: () => getLoanPayments(businessId, loanId!),
		enabled: Boolean(businessId && loanId),
	});
}

export function useLoanSummary(businessId: string) {
	return useQuery({
		queryKey: loansQueryKeys.summary(businessId),
		queryFn: () => getLoanSummary(businessId),
		enabled: Boolean(businessId),
	});
}

function invalidateAll(
	queryClient: ReturnType<typeof useQueryClient>,
	businessId: string,
) {
	void queryClient.invalidateQueries({ queryKey: ["loans", businessId] });
	void queryClient.invalidateQueries({ queryKey: ["loan", businessId] });
	void queryClient.invalidateQueries({
		queryKey: ["loan-payments", businessId],
	});
	void queryClient.invalidateQueries({
		queryKey: loansQueryKeys.summary(businessId),
	});
	void queryClient.invalidateQueries({
		queryKey: ["dashboard-summary", businessId],
	});
	void queryClient.invalidateQueries({
		queryKey: ["customers", businessId],
	});
}

export function useCreateLoan(businessId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: Parameters<typeof createLoan>[1]) =>
			createLoan(businessId, input),
		onSuccess: () => invalidateAll(queryClient, businessId),
	});
}

export function useCreateLoanPayment(businessId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			loanId,
			input,
		}: {
			loanId: string;
			input: Parameters<typeof createLoanPayment>[2];
		}) => createLoanPayment(businessId, loanId, input),
		onSuccess: () => invalidateAll(queryClient, businessId),
	});
}

export function useCancelLoan(businessId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ loanId, reason }: { loanId: string; reason: string }) =>
			cancelLoan(businessId, loanId, reason),
		onSuccess: () => invalidateAll(queryClient, businessId),
	});
}

export function useCancelLoanPayment(businessId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			loanId,
			paymentId,
			reason,
		}: {
			loanId: string;
			paymentId: string;
			reason: string;
		}) => cancelLoanPayment(businessId, loanId, paymentId, reason),
		onSuccess: () => invalidateAll(queryClient, businessId),
	});
}
