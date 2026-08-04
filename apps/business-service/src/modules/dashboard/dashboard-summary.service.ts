import { membersService, permissions } from "../businesses/members.service";
import {
	dashboardSummaryRepository,
	type DashboardSummaryRepository,
} from "./dashboard-summary.repository";
import type { DashboardSummaryResponse } from "./types/dashboard-summary.types";

type Range = { from?: string; to?: string };

const money = (value: number) =>
	new Intl.NumberFormat("es-CO", {
		currency: "COP",
		maximumFractionDigits: 0,
		style: "currency",
	}).format(value);

function toIsoDate(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function defaultRange(): { from: string; to: string } {
	const to = new Date();
	const from = new Date(to);
	from.setDate(to.getDate() - 6);
	return { from: toIsoDate(from), to: toIsoDate(to) };
}

function eachDay(from: string, to: string) {
	const days: string[] = [];
	const cursor = new Date(`${from}T00:00:00`);
	const end = new Date(`${to}T00:00:00`);
	while (cursor <= end) {
		days.push(toIsoDate(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}
	return days;
}

function calcDebt(
	pendingCredits: {
		id: string;
		customerId: string;
		originalAmount: number;
		creditDate: string;
	}[],
	payments: { creditId: string; amount: number }[],
) {
	const paid = new Map<string, number>();
	for (const payment of payments)
		paid.set(
			payment.creditId,
			(paid.get(payment.creditId) ?? 0) + payment.amount,
		);

	const customers = new Set<string>();
	let totalDebt = 0;
	let oldDebts = 0;
	const today = new Date();

	for (const credit of pendingCredits) {
		const remaining = Math.max(
			0,
			credit.originalAmount - (paid.get(credit.id) ?? 0),
		);
		if (!remaining) continue;
		totalDebt += remaining;
		customers.add(credit.customerId);
		const age = Math.floor(
			(today.getTime() - new Date(`${credit.creditDate}T00:00:00Z`).getTime()) /
				86400000,
		);
		if (age > 15) oldDebts += 1;
	}

	return { totalDebt, customersWithDebt: customers.size, oldDebts };
}

export function createDashboardSummaryService(
	repository: DashboardSummaryRepository = dashboardSummaryRepository,
) {
	return {
		async get(
			userId: string,
			businessId: string,
			requestedRange: Range,
		): Promise<DashboardSummaryResponse> {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.cashRead,
			);

			const fallback = defaultRange();
			const range = {
				from: requestedRange.from ?? fallback.from,
				to: requestedRange.to ?? fallback.to,
			};

			const [movements, pendingCredits] = await Promise.all([
				repository.findActiveMovementsByBusinessAndDateRange(businessId, range),
				repository.findPendingCreditsByBusiness(businessId),
			]);
			const payments = await repository.findActivePaymentsForCredits(
				pendingCredits.map((credit) => credit.id),
			);
			const debt = calcDebt(pendingCredits, payments);

			let salesAmount = 0;
			let salesCount = 0;
			let expensesAmount = 0;
			let expensesCount = 0;
			let creditPaymentsAmount = 0;
			let creditPaymentsCount = 0;

			const daily = new Map(
				eachDay(range.from, range.to).map((date) => [
					date,
					{ date, sales: 0, expenses: 0, creditPayments: 0, net: 0 },
				]),
			);
			const paymentMethods = new Map<
				string,
				{ name: string; amount: number; count: number }
			>();
			const categories = new Map<
				string,
				{
					name: string;
					type: "SALE" | "EXPENSE";
					amount: number;
					count: number;
				}
			>();

			for (const movement of movements) {
				const day = daily.get(movement.businessDate) ?? {
					date: movement.businessDate,
					sales: 0,
					expenses: 0,
					creditPayments: 0,
					net: 0,
				};
				if (movement.type === "SALE") {
					salesAmount += movement.amount;
					salesCount += 1;
					day.sales += movement.amount;
					const methodName = movement.paymentMethod ?? "Sin medio";
					const method = paymentMethods.get(methodName) ?? {
						name: methodName,
						amount: 0,
						count: 0,
					};
					method.amount += movement.amount;
					method.count += 1;
					paymentMethods.set(methodName, method);
				} else if (movement.type === "EXPENSE") {
					expensesAmount += movement.amount;
					expensesCount += 1;
					day.expenses += movement.amount;
				} else if (movement.type === "CREDIT_PAYMENT") {
					creditPaymentsAmount += movement.amount;
					creditPaymentsCount += 1;
					day.creditPayments += movement.amount;
				}
				day.net = day.sales + day.creditPayments - day.expenses;
				daily.set(movement.businessDate, day);

				if (
					(movement.type === "SALE" || movement.type === "EXPENSE") &&
					movement.category
				) {
					const key = `${movement.type}:${movement.category}`;
					const category = categories.get(key) ?? {
						name: movement.category,
						type: movement.type,
						amount: 0,
						count: 0,
					};
					category.amount += movement.amount;
					category.count += 1;
					categories.set(key, category);
				}
			}

			const netCashFlow = salesAmount + creditPaymentsAmount - expensesAmount;
			const paymentMethodRows = Array.from(paymentMethods.values())
				.sort((a, b) => b.amount - a.amount)
				.slice(0, 6)
				.map((item) => ({
					...item,
					share: salesAmount
						? Math.round((item.amount / salesAmount) * 100)
						: 0,
				}));
			const topCategories = Array.from(categories.values())
				.sort((a, b) => b.amount - a.amount)
				.slice(0, 6);

			return {
				period: range,
				kpis: {
					salesAmount,
					salesCount,
					expensesAmount,
					expensesCount,
					creditPaymentsAmount,
					creditPaymentsCount,
					netCashFlow,
					averageSaleTicket: salesCount
						? Math.round(salesAmount / salesCount)
						: 0,
					totalDebt: debt.totalDebt,
					customersWithDebt: debt.customersWithDebt,
					oldDebts: debt.oldDebts,
				},
				dailyCashFlow: Array.from(daily.values()).sort((a, b) =>
					a.date.localeCompare(b.date),
				),
				paymentMethods: paymentMethodRows,
				topCategories,
				insights: [
					{
						label: "Método principal",
						value: paymentMethodRows[0]?.name ?? "Sin ventas",
						detail: paymentMethodRows[0]
							? `${paymentMethodRows[0].share}% de las ventas del período`
							: "Registra ventas para ver tendencias",
						tone: "info",
					},
					{
						label: "Flujo neto",
						value: money(netCashFlow),
						detail:
							netCashFlow >= 0
								? "Entró más dinero del que salió"
								: "Los gastos superan las entradas",
						tone: netCashFlow >= 0 ? "success" : "warning",
					},
					{
						label: "Cartera pendiente",
						value: money(debt.totalDebt),
						detail: `${debt.customersWithDebt} cliente${debt.customersWithDebt === 1 ? "" : "s"} con saldo`,
						tone: debt.oldDebts ? "warning" : "info",
					},
				],
			};
		},
	};
}

export const dashboardSummaryService = createDashboardSummaryService();
