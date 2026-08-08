"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
	ArrowRight01Icon,
	BankIcon,
	ChartLineData01Icon,
	Dollar01Icon,
	Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	XAxis,
} from "recharts";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useDashboardSummary } from "@/lib/queries/dashboard-summary";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
	currency: "COP",
	maximumFractionDigits: 0,
	style: "currency",
});

const compactCurrencyFormatter = new Intl.NumberFormat("es-CO", {
	currency: "COP",
	maximumFractionDigits: 0,
	notation: "compact",
	style: "currency",
});

const dayFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "2-digit",
	month: "short",
});

const periodOptions = [
	["7d", "7 días"],
	["30d", "30 días"],
	["month", "Este mes"],
] as const;

type Period = (typeof periodOptions)[number][0];

function toIsoDate(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function periodRange(period: Period) {
	const to = new Date();
	const from = new Date(to);
	if (period === "7d") from.setDate(to.getDate() - 6);
	if (period === "30d") from.setDate(to.getDate() - 29);
	if (period === "month") from.setDate(1);
	return { from: toIsoDate(from), to: toIsoDate(to) };
}

const creditFlowConfig = {
	abonos: { label: "Abonos recibidos", color: "var(--chart-2)" },
	otorgado: { label: "Crédito otorgado", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function ResumenGeneralPage({ businessId }: { businessId: string }) {
	const [period, setPeriod] = useState<Period>("7d");
	const range = useMemo(() => periodRange(period), [period]);
	const summaryQuery = useDashboardSummary(businessId, range);
	const summary = summaryQuery.data;

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-sm font-medium text-primary">Resumen general</p>
					<h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
						Ventas, fiados y préstamos
					</h1>
					<p className="mt-1.5 max-w-xl text-muted-foreground text-pretty">
						Un vistazo al movimiento de tu negocio en el período seleccionado.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{periodOptions.map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => setPeriod(value)}
							className={
								period === value
									? "rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
									: "rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
							}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{summaryQuery.isLoading || !summary ? (
				<OikentraLoader
					label="Calculando resumen general"
					className="min-h-[48vh]"
				/>
			) : (
				<>
					<div className="grid gap-4 md:grid-cols-3">
						<AreaCard
							icon={<HugeiconsIcon icon={Dollar01Icon} size={16} />}
							title="Ventas"
							description="Movimiento de caja operativa."
							href={`/dashboard/${businessId}/ventas`}
							actionLabel="Ver ventas"
							mainLabel="Ventas del período"
							mainValue={currencyFormatter.format(
								summary.kpis.salesAmount,
							)}
							rows={[
								{
									label: "Ventas registradas",
									value: String(summary.kpis.salesCount),
								},
								{
									label: "Gastos del período",
									value: currencyFormatter.format(
										summary.kpis.expensesAmount,
									),
									tone: "danger",
								},
								{
									label: "Flujo neto",
									value: currencyFormatter.format(summary.kpis.netCashFlow),
									tone: summary.kpis.netCashFlow >= 0 ? "default" : "danger",
								},
								{
									label: "Ticket promedio",
									value: compactCurrencyFormatter.format(
										summary.kpis.averageSaleTicket,
									),
								},
							]}
						/>
						<AreaCard
							icon={<HugeiconsIcon icon={Wallet01Icon} size={16} />}
							title="Fiados"
							description="Cartera de fiados y sus abonos."
							href={`/dashboard/${businessId}/fiados`}
							actionLabel="Ver fiados"
							mainLabel="Cartera pendiente"
							mainValue={currencyFormatter.format(summary.kpis.totalDebt)}
							mainTone={summary.kpis.oldDebts ? "warning" : "default"}
							rows={[
								{
									label: "Clientes con saldo",
									value: String(summary.kpis.customersWithDebt),
								},
								{
									label: "Deudas antiguas (+15 días)",
									value: String(summary.kpis.oldDebts),
									tone: summary.kpis.oldDebts ? "warning" : "default",
								},
								{
									label: "Abonos del período",
									value: currencyFormatter.format(
										summary.kpis.creditPaymentsAmount,
									),
								},
								{
									label: "Fiados otorgados",
									value: currencyFormatter.format(
										summary.kpis.creditDisbursementsAmount,
									),
								},
							]}
						/>
						<AreaCard
							icon={<HugeiconsIcon icon={BankIcon} size={16} />}
							title="Préstamos"
							description="Cartera de préstamos y sus abonos."
							href={`/dashboard/${businessId}/prestamos`}
							actionLabel="Ver préstamos"
							mainLabel="Por cobrar"
							mainValue={currencyFormatter.format(summary.kpis.loanDebt)}
							mainTone={summary.kpis.overdueLoans ? "warning" : "default"}
							rows={[
								{
									label: "Clientes con deuda",
									value: String(summary.kpis.loansWithDebt),
								},
								{
									label: "Préstamos vencidos",
									value: String(summary.kpis.overdueLoans),
									tone: summary.kpis.overdueLoans ? "warning" : "default",
								},
								{
									label: "Abonos del período",
									value: currencyFormatter.format(
										summary.kpis.loanPaymentsAmount,
									),
								},
								{
									label: "Desembolsos del período",
									value: currencyFormatter.format(
										summary.kpis.loanDisbursementsAmount,
									),
								},
							]}
						/>
					</div>

					<CreditFlowChart data={summary.dailyCashFlow} />
				</>
			)}
		</div>
	);
}

function AreaCard({
	icon,
	title,
	description,
	href,
	actionLabel,
	mainLabel,
	mainValue,
	mainTone = "default",
	rows,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	href: string;
	actionLabel: string;
	mainLabel: string;
	mainValue: string;
	mainTone?: "default" | "danger" | "warning";
	rows: {
		label: string;
		value: string;
		tone?: "default" | "danger" | "warning";
	}[];
}) {
	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
						{icon}
					</span>
					{title}
				</div>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<p className="text-xs text-muted-foreground">{mainLabel}</p>
					<p
						className={
							mainTone === "danger"
								? "text-2xl font-semibold tracking-tight text-destructive"
								: mainTone === "warning"
									? "text-2xl font-semibold tracking-tight text-amber-600"
									: "text-2xl font-semibold tracking-tight"
						}
					>
						{mainValue}
					</p>
				</div>
				<div className="space-y-2">
					{rows.map((row) => (
						<div
							key={row.label}
							className="flex items-center justify-between gap-3 border-t pt-2 text-sm"
						>
							<span className="text-muted-foreground">{row.label}</span>
							<span
								className={
									row.tone === "danger"
										? "font-medium tabular-nums text-destructive"
										: row.tone === "warning"
											? "font-medium tabular-nums text-amber-600"
											: "font-medium tabular-nums"
								}
							>
								{row.value}
							</span>
						</div>
					))}
				</div>
				<Button
					variant="outline"
					size="sm"
					className="w-full"
					render={<Link href={href} />}
				>
					{actionLabel}
					<HugeiconsIcon icon={ArrowRight01Icon} size={14} aria-hidden="true" />
				</Button>
			</CardContent>
		</Card>
	);
}

function CreditFlowChart({
	data,
}: {
	data: {
		date: string;
		creditPayments: number;
		creditDisbursements: number;
		loanPayments: number;
		loanDisbursements: number;
	}[];
}) {
	const chartData = data.map((item) => ({
		...item,
		label: dayFormatter.format(new Date(`${item.date}T00:00:00`)),
		abonos: item.creditPayments + item.loanPayments,
		otorgado: item.creditDisbursements + item.loanDisbursements,
	}));

	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HugeiconsIcon icon={ChartLineData01Icon} size={18} />
					Movimiento de cartera
				</CardTitle>
				<CardDescription>
					Abonos recibidos frente a crédito otorgado por día.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={creditFlowConfig} className="h-[280px] w-full">
					<AreaChart accessibilityLayer data={chartData}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(value, name) => (
										<>
											<span className="text-muted-foreground">
												{creditFlowConfig[
													String(name) as keyof typeof creditFlowConfig
												]?.label ?? name}
											</span>
											<span className="ml-auto font-mono font-medium tabular-nums">
												{currencyFormatter.format(Number(value))}
											</span>
										</>
									)}
								/>
							}
						/>
						<Area
							type="monotone"
							dataKey="abonos"
							stroke="var(--color-abonos)"
							fill="var(--color-abonos)"
							fillOpacity={0.3}
						/>
						<Area
							type="monotone"
							dataKey="otorgado"
							stroke="var(--color-otorgado)"
							fill="var(--color-otorgado)"
							fillOpacity={0.25}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
