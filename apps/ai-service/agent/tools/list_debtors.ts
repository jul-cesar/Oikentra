import { defineTool } from "eve/tools";

import { businessApi, businessPath } from "../lib/api-client";
import { resolveOikentraContext } from "../lib/agent-context";

type Customer = {
	id: string;
	name: string;
	phone: string | null;
	status: string;
	totalDebt?: number;
	activeCredits?: number;
	oldDebt?: boolean;
};

type ListDebtorsOutput = {
	businessId: string;
	limit: number;
	totalDebt: number;
	customersWithDebt: number;
	oldDebtCount: number;
	debtors: {
		id: string;
		name: string;
		phone: string | null;
		totalDebt: number;
		activeCredits: number;
		oldDebt: boolean;
	}[];
};

function readLimit(input: Record<string, unknown>) {
	const limit = input.limit;
	if (limit === undefined) return 10;
	if (typeof limit === "number" && Number.isInteger(limit) && limit >= 1 && limit <= 50) {
		return limit;
	}
	throw new Error("limit must be an integer between 1 and 50.");
}

export default defineTool<ListDebtorsOutput>({
	description:
		"Lista los clientes activos que tienen saldo pendiente, ordenados por mayor deuda. Úsala para responder quiénes deben, a quién cobrar o principales deudores.",
	inputSchema: {
		type: "object",
		additionalProperties: false,
		properties: {
			limit: {
				type: "number",
				minimum: 1,
				maximum: 50,
				description: "Cantidad máxima de clientes a devolver. Por defecto 10.",
			},
		},
	},
	async execute(input, ctx): Promise<ListDebtorsOutput> {
		const context = resolveOikentraContext(ctx);
		const limit = readLimit(input);
		const customers = await businessApi<Customer[]>(
			context,
			businessPath(context, "/customers"),
			{ signal: ctx.abortSignal },
		);

		const debtors = customers
			.filter(
				(customer) =>
					customer.status === "ACTIVE" && (customer.totalDebt ?? 0) > 0,
			)
			.sort(
				(a, b) =>
					(b.totalDebt ?? 0) - (a.totalDebt ?? 0) ||
					a.name.localeCompare(b.name, "es"),
			)
			.map((customer) => ({
				id: customer.id,
				name: customer.name,
				phone: customer.phone,
				totalDebt: customer.totalDebt ?? 0,
				activeCredits: customer.activeCredits ?? 0,
				oldDebt: customer.oldDebt ?? false,
			}));

		return {
			businessId: context.businessId,
			limit,
			totalDebt: debtors.reduce((sum, debtor) => sum + debtor.totalDebt, 0),
			customersWithDebt: debtors.length,
			oldDebtCount: debtors.filter((debtor) => debtor.oldDebt).length,
			debtors: debtors.slice(0, limit),
		};
	},
	toModelOutput(output) {
		return {
			type: "json",
			value: {
				totalDebt: output.totalDebt,
				customersWithDebt: output.customersWithDebt,
				oldDebtCount: output.oldDebtCount,
				debtors: output.debtors,
			},
		};
	},
});
