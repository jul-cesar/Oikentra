import { defineTool } from "eve/tools";

import { businessApi, businessPath } from "../lib/api-client";
import { resolveOikentraContext } from "../lib/agent-context";

type ComparisonMode = "today_vs_yesterday" | "week_vs_previous" | "custom";

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
};

type PeriodComparison = {
	current: DashboardSummary;
	previous: DashboardSummary;
	delta: {
		salesAmount: number;
		expensesAmount: number;
		creditPaymentsAmount: number;
		netCashFlow: number;
		salesCount: number;
		expensesCount: number;
	};
	percentage: {
		salesAmount: number | null;
		expensesAmount: number | null;
		creditPaymentsAmount: number | null;
		netCashFlow: number | null;
	};
};

type CompareBusinessPeriodsOutput = PeriodComparison & {
	businessId: string;
	mode: ComparisonMode;
};

function toIsoDate(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
	const copy = new Date(date);
	copy.setDate(copy.getDate() + days);
	return copy;
}

function readMode(input: Record<string, unknown>): ComparisonMode {
	const mode = input.mode;
	if (mode === undefined) return "today_vs_yesterday";
	if (
		mode === "today_vs_yesterday" ||
		mode === "week_vs_previous" ||
		mode === "custom"
	) {
		return mode;
	}
	throw new Error("mode must be today_vs_yesterday, week_vs_previous, or custom.");
}

function readDate(input: Record<string, unknown>, key: string) {
	const value = input[key];
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	throw new Error(`${key} must be YYYY-MM-DD.`);
}

function resolveRanges(input: Record<string, unknown>) {
	const mode = readMode(input);
	const today = new Date();

	if (mode === "today_vs_yesterday") {
		return {
			mode,
			current: { from: toIsoDate(today), to: toIsoDate(today) },
			previous: { from: toIsoDate(addDays(today, -1)), to: toIsoDate(addDays(today, -1)) },
		};
	}

	if (mode === "week_vs_previous") {
		return {
			mode,
			current: { from: toIsoDate(addDays(today, -6)), to: toIsoDate(today) },
			previous: { from: toIsoDate(addDays(today, -13)), to: toIsoDate(addDays(today, -7)) },
		};
	}

	const currentFrom = readDate(input, "currentFrom");
	const currentTo = readDate(input, "currentTo");
	const previousFrom = readDate(input, "previousFrom");
	const previousTo = readDate(input, "previousTo");

	if (currentFrom > currentTo || previousFrom > previousTo) {
		throw new Error("from must be before or equal to to.");
	}

	return {
		mode,
		current: { from: currentFrom, to: currentTo },
		previous: { from: previousFrom, to: previousTo },
	};
}

function percentageDelta(current: number, previous: number) {
	if (previous === 0) return null;
	return Math.round(((current - previous) / previous) * 100);
}

function compare(current: DashboardSummary, previous: DashboardSummary): PeriodComparison {
	return {
		current,
		previous,
		delta: {
			salesAmount: current.kpis.salesAmount - previous.kpis.salesAmount,
			expensesAmount: current.kpis.expensesAmount - previous.kpis.expensesAmount,
			creditPaymentsAmount:
				current.kpis.creditPaymentsAmount - previous.kpis.creditPaymentsAmount,
			netCashFlow: current.kpis.netCashFlow - previous.kpis.netCashFlow,
			salesCount: current.kpis.salesCount - previous.kpis.salesCount,
			expensesCount: current.kpis.expensesCount - previous.kpis.expensesCount,
		},
		percentage: {
			salesAmount: percentageDelta(
				current.kpis.salesAmount,
				previous.kpis.salesAmount,
			),
			expensesAmount: percentageDelta(
				current.kpis.expensesAmount,
				previous.kpis.expensesAmount,
			),
			creditPaymentsAmount: percentageDelta(
				current.kpis.creditPaymentsAmount,
				previous.kpis.creditPaymentsAmount,
			),
			netCashFlow: percentageDelta(
				current.kpis.netCashFlow,
				previous.kpis.netCashFlow,
			),
		},
	};
}

export default defineTool<CompareBusinessPeriodsOutput>({
	description:
		"Compara dos periodos del negocio activo. Úsala para preguntas como si se vendió más que ayer, cómo va esta semana frente a la anterior o comparaciones de entradas/salidas.",
	inputSchema: {
		type: "object",
		additionalProperties: false,
		properties: {
			mode: {
				type: "string",
				enum: ["today_vs_yesterday", "week_vs_previous", "custom"],
				description: "Comparación predefinida o custom. Por defecto today_vs_yesterday.",
			},
			currentFrom: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
			currentTo: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
			previousFrom: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
			previousTo: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
		},
	},
	async execute(input, ctx): Promise<CompareBusinessPeriodsOutput> {
		const context = resolveOikentraContext(ctx);
		const ranges = resolveRanges(input);

		const [current, previous] = await Promise.all([
			businessApi<DashboardSummary>(
				context,
				businessPath(context, "/dashboard-summary"),
				{ query: ranges.current, signal: ctx.abortSignal },
			),
			businessApi<DashboardSummary>(
				context,
				businessPath(context, "/dashboard-summary"),
				{ query: ranges.previous, signal: ctx.abortSignal },
			),
		]);

		return {
			businessId: context.businessId,
			mode: ranges.mode,
			...compare(current, previous),
		};
	},
	toModelOutput(output) {
		return {
			type: "json",
			value: {
				mode: output.mode,
				current: { period: output.current.period, kpis: output.current.kpis },
				previous: { period: output.previous.period, kpis: output.previous.kpis },
				delta: output.delta,
				percentage: output.percentage,
			},
		};
	},
});
