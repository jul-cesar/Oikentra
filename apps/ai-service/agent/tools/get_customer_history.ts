import { defineTool } from "eve/tools";

import { businessApi, businessPath } from "../lib/api-client";
import { resolveOikentraContext } from "../lib/agent-context";

type CustomerHistory = {
	customerId: string;
	totalCredits: number;
	totalDebt: number;
	totalPaid: number;
	credits: {
		id: string;
		originalAmount: number;
		paidAmount: number;
		remainingAmount: number;
		description: string | null;
		creditDate: string;
		status: string;
		payments: {
			id: string;
			amount: number;
			paymentDate: string;
			note: string | null;
			status: string;
		}[];
	}[];
};

type GetCustomerHistoryOutput = CustomerHistory & {
	businessId: string;
	limit: number;
};

function readCustomerId(input: Record<string, unknown>) {
	const customerId = input.customerId;
	if (typeof customerId !== "string" || !customerId.trim()) {
		throw new Error("customerId is required.");
	}
	return customerId.trim();
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

export default defineTool<GetCustomerHistoryOutput>({
	description:
		"Consulta el historial read-only de fiados y abonos de un cliente. Úsala después de find_customer cuando el usuario pida historial, movimientos de un cliente o detalle de pagos.",
	inputSchema: {
		type: "object",
		additionalProperties: false,
		required: ["customerId"],
		properties: {
			customerId: {
				type: "string",
				minLength: 1,
				description: "ID del cliente resuelto por find_customer.",
			},
			limit: {
				type: "number",
				minimum: 1,
				maximum: 50,
				description: "Cantidad máxima de fiados a devolver. Por defecto 10.",
			},
		},
	},
	async execute(input, ctx): Promise<GetCustomerHistoryOutput> {
		const context = resolveOikentraContext(ctx);
		const customerId = readCustomerId(input);
		const limit = readLimit(input);
		const history = await businessApi<CustomerHistory>(
			context,
			businessPath(
				context,
				`/customers/${encodeURIComponent(customerId)}/history`,
			),
			{ signal: ctx.abortSignal },
		);

		return {
			...history,
			businessId: context.businessId,
			limit,
			credits: [...history.credits]
				.sort((a, b) => b.creditDate.localeCompare(a.creditDate))
				.slice(0, limit),
		};
	},
	toModelOutput(output) {
		return {
			type: "json",
			value: {
				customerId: output.customerId,
				totalCredits: output.totalCredits,
				totalDebt: output.totalDebt,
				totalPaid: output.totalPaid,
				credits: output.credits,
			},
		};
	},
});
