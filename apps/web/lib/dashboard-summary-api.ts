export type DashboardSummary = {
	period: { from: string; to: string };
	kpis: {
		salesAmount: number;
		salesCount: number;
		expensesAmount: number;
		expensesCount: number;
		creditPaymentsAmount: number;
		creditPaymentsCount: number;
		creditDisbursementsAmount: number;
		netCashFlow: number;
		averageSaleTicket: number;
		totalDebt: number;
		customersWithDebt: number;
		oldDebts: number;
		loanDebt: number;
		loansWithDebt: number;
		overdueLoans: number;
		loanPaymentsAmount: number;
		loanDisbursementsAmount: number;
	};
	dailyCashFlow: {
		date: string;
		sales: number;
		expenses: number;
		creditPayments: number;
		creditDisbursements: number;
		loanPayments: number;
		loanDisbursements: number;
		net: number;
	}[];
	paymentMethods: {
		name: string;
		amount: number;
		count: number;
		share: number;
	}[];
	topCategories: {
		name: string;
		type: "SALE" | "EXPENSE";
		amount: number;
		count: number;
	}[];
	insights: {
		label: string;
		value: string;
		detail: string;
		tone: "success" | "warning" | "info";
	}[];
};

async function request<T>(url: string): Promise<T> {
	const response = await fetch(url, { credentials: "include" });
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

export function getDashboardSummary(
	businessId: string,
	range?: { from?: string; to?: string },
) {
	const params = new URLSearchParams();
	if (range?.from) params.set("from", range.from);
	if (range?.to) params.set("to", range.to);
	const query = params.toString();
	return request<DashboardSummary>(
		`/api/business/businesses/${encodeURIComponent(businessId)}/dashboard-summary${query ? `?${query}` : ""}`,
	);
}
