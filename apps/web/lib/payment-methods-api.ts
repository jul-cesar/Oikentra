export type PaymentMethod = {
	id: string;
	businessId: string;
	name: string;
	status: "ACTIVE" | "INACTIVE";
	createdAt: string;
	updatedAt: string;
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
	`/api/business/businesses/${encodeURIComponent(businessId)}/payment-methods`;

export function getPaymentMethods(businessId: string) {
	return request<PaymentMethod[]>(base(businessId));
}

export function createPaymentMethod(
	businessId: string,
	input: { name: string },
) {
	return request<PaymentMethod>(base(businessId), {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function updatePaymentMethod(
	businessId: string,
	paymentMethodId: string,
	input: { name: string },
) {
	return request<PaymentMethod>(
		`${base(businessId)}/${encodeURIComponent(paymentMethodId)}`,
		{ method: "PUT", body: JSON.stringify(input) },
	);
}

export function deactivatePaymentMethod(
	businessId: string,
	paymentMethodId: string,
) {
	return request<PaymentMethod>(
		`${base(businessId)}/${encodeURIComponent(paymentMethodId)}/deactivate`,
		{ method: "POST" },
	);
}
