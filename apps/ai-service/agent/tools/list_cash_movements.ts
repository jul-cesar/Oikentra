import { defineTool } from "eve/tools";

import { businessApi, businessPath } from "../lib/api-client";
import { resolveOikentraContext } from "../lib/agent-context";

type MovementType = "SALE" | "EXPENSE" | "CREDIT_PAYMENT";

type CashMovement = {
	id: string;
	type: MovementType;
	amount: number;
	category: string | null;
	paymentMethod: string | null;
	note: string | null;
	businessDate: string;
	occurredAt: string;
	status: string;
	sourceCustomer: { id: string; name: string } | null;
};

type ListCashMovementsOutput = {
	businessId: string;
	from?: string;
	to?: string;
	type: MovementType | "ALL";
	limit: number;
	totals: {
		sales: number;
		expenses: number;
		creditPayments: number;
		net: number;
	};
	count: number;
	movements: {
		id: string;
		type: MovementType;
		amount: number;
		category: string | null;
		paymentMethod: string | null;
		note: string | null;
		businessDate: string;
		occurredAt: string;
		customerName: string | null;
	}[];
};

function readDate(input: Record<string, unknown>, key: "from" | "to") {
	const value = input[key];
	if (value === undefined) return undefined;
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
		return value;
	throw new Error(`${key} must be YYYY-MM-DD.`);
}

function readType(input: Record<string, unknown>): MovementType | "ALL" {
	const value = input.type;
	if (value === undefined) return "ALL";
	if (
		value === "SALE" ||
		value === "EXPENSE" ||
		value === "CREDIT_PAYMENT" ||
		value === "ALL"
	) {
		return value;
	}
	throw new Error("type must be SALE, EXPENSE, CREDIT_PAYMENT, or ALL.");
}

function readLimit(input: Record<string, unknown>) {
	const limit = input.limit;
	if (limit === undefined) return 10;
	if (
		typeof limit === "number" &&
		Number.isInteger(limit) &&
		limit >= 1 &&
		limit <= 50
	)
		return limit;
	throw new Error("limit must be an integer between 1 and 50.");
}

export default defineTool<ListCashMovementsOutput>({
	description:
		"Consulta los movimientos de caja recientes del negocio: ventas, gastos y abonos recibidos. Úsala para listar entradas/salidas o explicar qué pasó en caja.",
	inputSchema: {
		type: "object",
		additionalProperties: false,
		properties: {
			from: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
			to: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
			type: {
				type: "string",
				enum: ["SALE", "EXPENSE", "CREDIT_PAYMENT", "ALL"],
			},
			limit: { type: "number", minimum: 1, maximum: 50 },
		},
	},
	async execute(input, ctx): Promise<ListCashMovementsOutput> {
		const context = resolveOikentraContext(ctx);
		const from = readDate(input, "from");
		const to = readDate(input, "to");
		const type = readType(input);
		const limit = readLimit(input);

		const records = await businessApi<CashMovement[]>(
			context,
			businessPath(context, "/cash-movements"),
			{ signal: ctx.abortSignal },
		);

		const filtered = records
			.filter((movement) => movement.status === "ACTIVE")
			.filter((movement) => (type === "ALL" ? true : movement.type === type))
			.filter((movement) => (from ? movement.businessDate >= from : true))
			.filter((movement) => (to ? movement.businessDate <= to : true))
			.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

		const totals = filtered.reduce(
			(acc, movement) => {
				if (movement.type === "SALE") acc.sales += movement.amount;
				if (movement.type === "EXPENSE") acc.expenses += movement.amount;
				if (movement.type === "CREDIT_PAYMENT")
					acc.creditPayments += movement.amount;
				return acc;
			},
			{ sales: 0, expenses: 0, creditPayments: 0 },
		);

		return {
			businessId: context.businessId,
			from,
			to,
			type,
			limit,
			totals: {
				...totals,
				net: totals.sales + totals.creditPayments - totals.expenses,
			},
			count: filtered.length,
			movements: filtered.slice(0, limit).map((movement) => ({
				id: movement.id,
				type: movement.type,
				amount: movement.amount,
				category: movement.category,
				paymentMethod: movement.paymentMethod,
				note: movement.note,
				businessDate: movement.businessDate,
				occurredAt: movement.occurredAt,
				customerName: movement.sourceCustomer?.name ?? null,
			})),
		};
	},
	toModelOutput(output) {
		return {
			type: "json",
			value: {
				from: output.from,
				to: output.to,
				type: output.type,
				totals: output.totals,
				count: output.count,
				movements: output.movements,
			},
		};
	},
});
