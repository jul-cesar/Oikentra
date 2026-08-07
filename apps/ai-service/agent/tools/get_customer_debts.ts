import { defineTool } from "eve/tools";

import { businessApi, businessPath } from "../lib/api-client";
import { resolveOikentraContext } from "../lib/agent-context";

type Credit = {
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
	payments: {
		id: string;
		amount: number;
		paymentDate: string;
		note: string | null;
		status: string;
	}[];
	createdAt: string;
	updatedAt: string;
};

type GetCustomerDebtsOutput = {
	customerId: string;
	businessId: string;
	status: "PENDING" | "PAID" | "CANCELLED" | "all";
	totalRemaining: number;
	debtCount: number;
	debts: {
		creditId: string;
		originalAmount: number;
		paidAmount: number;
		remainingAmount: number;
		description: string | null;
		creditDate: string;
		status: Credit["status"];
		paymentsCount: number;
	}[];
};

function readCustomerId(input: Record<string, unknown>) {
	const customerId = input.customerId;
	if (typeof customerId !== "string" || !customerId.trim()) {
		throw new Error("customerId is required.");
	}
	return customerId.trim();
}

function readStatus(input: Record<string, unknown>) {
	const status = input.status;
	if (status === undefined) return "PENDING";
	if (
		status === "PENDING" ||
		status === "PAID" ||
		status === "CANCELLED" ||
		status === "all"
	) {
		return status;
	}
	throw new Error("status must be PENDING, PAID, CANCELLED, or all.");
}

export default defineTool<GetCustomerDebtsOutput>({
	description:
		"Consulta los fiados/deudas de un cliente del negocio activo. Úsala después de resolver el cliente con find_customer.",
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
			status: {
				type: "string",
				enum: ["PENDING", "PAID", "CANCELLED", "all"],
				description: "Estado de fiados a consultar. Por defecto PENDING.",
			},
		},
	},
	async execute(input, ctx): Promise<GetCustomerDebtsOutput> {
		const customerId = readCustomerId(input);
		const status = readStatus(input);
		const context = resolveOikentraContext(ctx);

		const query = status === "all" ? { customerId } : { customerId, status };
		const credits = await businessApi<Credit[]>(
			context,
			businessPath(context, "/credits"),
			{
				query,
				signal: ctx.abortSignal,
			},
		);

		const debts = credits
			.map((credit) => ({
				creditId: credit.id,
				originalAmount: credit.originalAmount,
				paidAmount: credit.paidAmount,
				remainingAmount: credit.remainingAmount,
				description: credit.description,
				creditDate: credit.creditDate,
				status: credit.status,
				paymentsCount: credit.payments.length,
			}))
			.sort((a, b) => a.creditDate.localeCompare(b.creditDate));

		return {
			customerId,
			businessId: context.businessId,
			status,
			totalRemaining: debts.reduce(
				(sum, debt) => sum + debt.remainingAmount,
				0,
			),
			debtCount: debts.length,
			debts,
		};
	},
	toModelOutput(output) {
		return {
			type: "json",
			value: {
				customerId: output.customerId,
				status: output.status,
				totalRemaining: output.totalRemaining,
				debtCount: output.debtCount,
				debts: output.debts,
			},
		};
	},
});
