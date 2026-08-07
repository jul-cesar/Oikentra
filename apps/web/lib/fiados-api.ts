export type Customer = {
	id: string;
	businessId: string;
	name: string;
	phone: string | null;
	notes: string | null;
	status: "ACTIVE" | "INACTIVE";
	totalDebt: number;
	activeCredits: number;
	oldDebt: boolean;
	createdAt: string;
	updatedAt: string;
};

export type CreditPayment = {
	id: string;
	userId: string;
	creditId: string;
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

export type Credit = {
	id: string;
	userId: string;
	customerId: string;
	originalAmount: number;
	paidAmount: number;
	remainingAmount: number;
	description: string | null;
	creditDate: string;
	status: "PENDING" | "PAID" | "CANCELLED";
	cancellationReason: string | null;
	cancelledAt: string | null;
	paidAt: string | null;
	payments: CreditPayment[];
	createdAt: string;
	updatedAt: string;
};

export type CreditSummary = {
	totalDebt: number;
	customersWithDebt: number;
	oldDebts: number;
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

export function getCustomers(businessId: string) {
	return request<Customer[]>(`${base(businessId)}/customers`);
}

export function createCustomer(
	businessId: string,
	input: { name: string; phone?: string; notes?: string },
) {
	return request<Customer>(`${base(businessId)}/customers`, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function updateCustomer(
	businessId: string,
	customerId: string,
	input: { name?: string; phone?: string | null; notes?: string | null },
) {
	return request<Customer>(
		`${base(businessId)}/customers/${encodeURIComponent(customerId)}`,
		{
			method: "PATCH",
			body: JSON.stringify(input),
		},
	);
}

export function deleteCustomer(businessId: string, customerId: string) {
	return request<Customer>(
		`${base(businessId)}/customers/${encodeURIComponent(customerId)}/delete`,
		{
			method: "POST",
		},
	);
}

export function getCustomer(businessId: string, customerId: string) {
	return request<Customer>(
		`${base(businessId)}/customers/${encodeURIComponent(customerId)}`,
	);
}

export function getCredits(businessId: string, status?: Credit["status"]) {
	const query = status ? `?status=${status}` : "";
	return request<Credit[]>(`${base(businessId)}/credits${query}`);
}

export function createCredit(
	businessId: string,
	input: {
		customerId: string;
		originalAmount: number;
		description?: string;
		creditDate: string;
	},
) {
	return request<Credit>(`${base(businessId)}/credits`, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function getCredit(businessId: string, creditId: string) {
	return request<Credit>(
		`${base(businessId)}/credits/${encodeURIComponent(creditId)}`,
	);
}

export function getPayments(businessId: string, creditId: string) {
	return request<CreditPayment[]>(
		`${base(businessId)}/credits/${encodeURIComponent(creditId)}/payments`,
	);
}

export function createPayment(
	businessId: string,
	creditId: string,
	input: { id?: string; amount: number; paymentDate: string; note?: string },
) {
	return request<Credit>(
		`${base(businessId)}/credits/${encodeURIComponent(creditId)}/payments`,
		{
			method: "POST",
			body: JSON.stringify(input),
		},
	);
}

export function cancelCredit(
	businessId: string,
	creditId: string,
	reason: string,
) {
	return request<Credit>(
		`${base(businessId)}/credits/${encodeURIComponent(creditId)}/cancel`,
		{
			method: "POST",
			body: JSON.stringify({ reason }),
		},
	);
}

export function cancelPayment(
	businessId: string,
	creditId: string,
	paymentId: string,
	reason: string,
) {
	return request<Credit>(
		`${base(businessId)}/credits/${encodeURIComponent(creditId)}/payments/${encodeURIComponent(paymentId)}/cancel`,
		{ method: "POST", body: JSON.stringify({ reason }) },
	);
}

export function getCreditSummary(businessId: string) {
	return request<CreditSummary>(`${base(businessId)}/credits/summary`);
}
