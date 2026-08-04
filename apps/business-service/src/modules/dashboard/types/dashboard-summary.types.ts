export type DashboardSummaryResponse = {
	period: {
		from: string;
		to: string;
	};
	kpis: {
		salesAmount: number;
		salesCount: number;
		expensesAmount: number;
		expensesCount: number;
		creditPaymentsAmount: number;
		creditPaymentsCount: number;
		netCashFlow: number;
		averageSaleTicket: number;
		totalDebt: number;
		customersWithDebt: number;
		oldDebts: number;
	};
	dailyCashFlow: {
		date: string;
		sales: number;
		expenses: number;
		creditPayments: number;
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
