export type LoanInstallment = {
	id: string;
	number: number;
	dueDate: string;
	principalAmount: number;
	interestAmount: number;
	totalAmount: number;
	paidAmount: number;
	status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
};

export type LoanPayment = {
	id: string;
	userId: string;
	loanId: string;
	cashMovementId: string;
	amount: number;
	paymentDate: string;
	note: string | null;
	status: "ACTIVE" | "CANCELLED";
	cancellationReason: string | null;
	cancelledAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type Loan = {
	id: string;
	userId: string;
	customerId: string;
	capitalAmount: number;
	interestRate: number;
	frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
	installmentAmount: number;
	interestAmount: number;
	totalAmount: number;
	paidAmount: number;
	remainingAmount: number;
	termCount: number;
	description: string | null;
	startDate: string;
	dueDate: string;
	status: "ACTIVE" | "PAID" | "DEFAULT" | "CANCELLED";
	cancellationReason: string | null;
	cancelledAt: string | null;
	paidAt: string | null;
	installments: LoanInstallment[];
	payments: LoanPayment[];
	createdAt: string;
	updatedAt: string;
};

export type LoanSummary = {
	totalDebt: number;
	customersWithDebt: number;
	overdueLoans: number;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...init,
		credentials: "include",
		headers: { "Content-Type": "application/json", ...init?.headers },
	});
	const body = (await response.json().catch(() => null)) as {
		data?: T;
		message?: string;
		code?: string;
	} | null;
	if (!response.ok || body?.data === undefined) {
		const error = new Error(
			body?.message || "No pudimos completar la solicitud.",
		) as Error & { code?: string };
		error.code = body?.code;
		throw error;
	}
	return body.data;
}

const base = (businessId: string) =>
	`/api/business/businesses/${encodeURIComponent(businessId)}`;

export function getLoans(businessId: string, status?: Loan["status"]) {
	const query = status ? `?status=${status}` : "";
	return request<Loan[]>(`${base(businessId)}/loans${query}`);
}

export function getLoan(businessId: string, loanId: string) {
	return request<Loan>(
		`${base(businessId)}/loans/${encodeURIComponent(loanId)}`,
	);
}

export function getLoanPayments(businessId: string, loanId: string) {
	return request<LoanPayment[]>(
		`${base(businessId)}/loans/${encodeURIComponent(loanId)}/payments`,
	);
}

export function createLoan(
	businessId: string,
	input: {
		customerId: string;
		capitalAmount: number;
		interestRate: number;
		frequency: Loan["frequency"];
		termCount: number;
		description?: string;
		startDate: string;
	},
) {
	return request<Loan>(`${base(businessId)}/loans`, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function createLoanPayment(
	businessId: string,
	loanId: string,
	input: { amount: number; paymentDate: string; note?: string },
) {
	return request<Loan>(
		`${base(businessId)}/loans/${encodeURIComponent(loanId)}/payments`,
		{
			method: "POST",
			body: JSON.stringify(input),
		},
	);
}

export function cancelLoan(businessId: string, loanId: string, reason: string) {
	return request<Loan>(
		`${base(businessId)}/loans/${encodeURIComponent(loanId)}/cancel`,
		{
			method: "POST",
			body: JSON.stringify({ reason }),
		},
	);
}

export function cancelLoanPayment(
	businessId: string,
	loanId: string,
	paymentId: string,
	reason: string,
) {
	return request<Loan>(
		`${base(businessId)}/loans/${encodeURIComponent(loanId)}/payments/${encodeURIComponent(paymentId)}/cancel`,
		{ method: "POST", body: JSON.stringify({ reason }) },
	);
}

export function getLoanSummary(businessId: string) {
	return request<LoanSummary>(`${base(businessId)}/loans/summary`);
}
