import { defineTool } from "eve/tools";

import { businessApi, businessPath } from "../lib/api-client";
import { resolveOikentraContext } from "../lib/agent-context";

type Period = "today" | "week" | "custom";

type DashboardSummary = {
	period: { from: string; to: string };
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

type BusinessSummaryOutput = DashboardSummary & {
	businessId: string;
	requestedPeriod: Period;
};

function toIsoDate(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function readPeriod(input: Record<string, unknown>): Period {
	const period = input.period;
	if (period === undefined) return "today";
	if (period === "today" || period === "week" || period === "custom")
		return period;
	throw new Error("period must be today, week, or custom.");
}

function readOptionalDate(input: Record<string, unknown>, key: "from" | "to") {
	const value = input[key];
	if (value === undefined) return undefined;
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
		return value;
	throw new Error(`${key} must be YYYY-MM-DD.`);
}

function resolveRange(input: Record<string, unknown>) {
	const period = readPeriod(input);
	const today = toIsoDate(new Date());

	if (period === "today") return { period, from: today, to: today };

	if (period === "week") {
		const from = new Date();
		from.setDate(from.getDate() - 6);
		return { period, from: toIsoDate(from), to: today };
	}

	const from = readOptionalDate(input, "from");
	const to = readOptionalDate(input, "to");
	if (!from || !to)
		throw new Error("from and to are required for custom period.");
	if (from > to) throw new Error("from must be before or equal to to.");
	return { period, from, to };
}

export default defineTool<BusinessSummaryOutput>({
	description:
		"Consulta un resumen del negocio activo: ventas, gastos, abonos recibidos, flujo neto y total por cobrar.",
	inputSchema: {
		type: "object",
		additionalProperties: false,
		properties: {
			period: {
				type: "string",
				enum: ["today", "week", "custom"],
				description: "Periodo a consultar. Usa today por defecto.",
			},
			from: {
				type: "string",
				pattern: "^\\d{4}-\\d{2}-\\d{2}$",
				description: "Fecha inicial YYYY-MM-DD para period=custom.",
			},
			to: {
				type: "string",
				pattern: "^\\d{4}-\\d{2}-\\d{2}$",
				description: "Fecha final YYYY-MM-DD para period=custom.",
			},
		},
	},
	async execute(input, ctx): Promise<BusinessSummaryOutput> {
		const context = resolveOikentraContext(ctx);
		const range = resolveRange(input);
		const summary = await businessApi<DashboardSummary>(
			context,
			businessPath(context, "/dashboard-summary"),
			{
				query: { from: range.from, to: range.to },
				signal: ctx.abortSignal,
			},
		);

		return {
			...summary,
			businessId: context.businessId,
			requestedPeriod: range.period,
		};
	},
	toModelOutput(output) {
		return {
			type: "json",
			value: {
				period: output.period,
				requestedPeriod: output.requestedPeriod,
				kpis: output.kpis,
				topCategories: output.topCategories.slice(0, 5),
				paymentMethods: output.paymentMethods.slice(0, 5),
				insights: output.insights,
			},
		};
	},
});
