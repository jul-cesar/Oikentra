"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
	ArrowUpRight01Icon,
	ArrowDownRight01Icon,
	ChartLineData01Icon,
	HandCoinsIcon,
	UserGroupIcon,
	Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { cn } from "@/lib/utils";
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
	day: "numeric",
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

function todayLabel() {
	return new Intl.DateTimeFormat("es-CO", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date());
}

type MetricCardProps = {
	title: string;
	value: string;
	icon: typeof Wallet01Icon;
	positive?: boolean;
	change?: string;
	tone?: "default" | "warning" | "danger";
};

function MetricCard({
	title,
	value,
	icon: Icon,
	positive,
	change,
	tone = "default",
}: MetricCardProps) {
	return (
		<article className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{title}
					</p>
					<p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
						{value}
					</p>
				</div>
				<div
					className={cn(
						"grid size-10 shrink-0 place-items-center rounded-xl",
						tone === "warning" && "bg-amber-100 text-amber-700",
						tone === "danger" && "bg-red-100 text-red-700",
						tone === "default" && "bg-primary/10 text-primary",
					)}
				>
					<HugeiconsIcon
						icon={Icon}
						size={20}
						strokeWidth={2}
						aria-hidden="true"
					/>
				</div>
			</div>
			{change ? (
				<div className="mt-4 flex items-center gap-2 text-xs">
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
							positive
								? "bg-emerald-100 text-emerald-700"
								: "bg-red-100 text-red-700",
						)}
					>
						<HugeiconsIcon
							icon={positive ? ArrowUpRight01Icon : ArrowDownRight01Icon}
							size={12}
							aria-hidden="true"
						/>
						{change}
					</span>
					<span className="text-muted-foreground">vs. período anterior</span>
				</div>
			) : null}
		</article>
	);
}

function IncomeChart({
	data,
}: {
	data: { date: string; sales: number; net: number }[];
}) {
	const chartData = useMemo(
		() =>
			data.map((item) => ({
				...item,
				label: dayFormatter.format(new Date(`${item.date}T00:00:00`)),
			})),
		[data],
	);

	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-base font-semibold">
					<HugeiconsIcon
						icon={ChartLineData01Icon}
						size={18}
						aria-hidden="true"
					/>
					Flujo de ingresos
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Ventas e ingresos netos por día
				</p>
			</CardHeader>
			<CardContent>
				<div className="h-[280px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={chartData}
							margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
						>
							<CartesianGrid vertical={false} stroke="var(--border)" />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
								tickFormatter={(value) =>
									compactCurrencyFormatter.format(Number(value))
								}
							/>
							<Tooltip
								cursor={{ fill: "var(--muted)", opacity: 0.3 }}
								formatter={(value, name) => [
									currencyFormatter.format(Number(value ?? 0)),
									name === "sales" ? "Ventas" : "Ingresos netos",
								]}
								labelFormatter={(label) => label}
								contentStyle={{
									borderRadius: 12,
									border: "1px solid var(--border)",
									background: "var(--card)",
								}}
							/>
							<Bar
								dataKey="sales"
								fill="var(--primary)"
								radius={[4, 4, 0, 0]}
								maxBarSize={40}
							/>
							<Bar
								dataKey="net"
								fill="var(--chart-2)"
								radius={[4, 4, 0, 0]}
								maxBarSize={40}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
				<div className="mt-4 flex items-center justify-center gap-6 text-xs">
					<span className="flex items-center gap-2 text-muted-foreground">
						<span className="inline-block size-2 rounded-full bg-primary" />
						Ventas
					</span>
					<span className="flex items-center gap-2 text-muted-foreground">
						<span className="inline-block size-2 rounded-full bg-[var(--chart-2)]" />
						Ingresos netos
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

export function DashboardPage({ businessId }: { businessId: string }) {
	const [period, setPeriod] = useState<Period>("7d");
	const range = useMemo(() => periodRange(period), [period]);
	const summaryQuery = useDashboardSummary(businessId, range);
	const summary = summaryQuery.data;

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{todayLabel()}
					</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
						Dashboard
					</h1>
					<p className="mt-2 max-w-xl text-muted-foreground text-pretty">
						Resumen del movimiento de tu negocio en el período seleccionado.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex flex-wrap gap-2">
						{periodOptions.map(([value, label]) => (
							<button
								key={value}
								type="button"
								onClick={() => setPeriod(value)}
								className={cn(
									"rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
									period === value
										? "bg-foreground text-background"
										: "bg-muted text-muted-foreground hover:text-foreground",
								)}
							>
								{label}
							</button>
						))}
					</div>
					<Button
						size="sm"
						render={<Link href={`/dashboard/${businessId}/ventas`} />}
					>
						Nuevo movimiento
					</Button>
				</div>
			</div>

			{summaryQuery.isLoading || !summary ? (
				<OikentraLoader label="Cargando dashboard" className="min-h-[48vh]" />
			) : (
				<>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<MetricCard
							title="Ventas del período"
							value={currencyFormatter.format(summary.kpis.salesAmount)}
							icon={Wallet01Icon}
						/>
						<MetricCard
							title="Ingresos netos"
							value={currencyFormatter.format(summary.kpis.netCashFlow)}
							icon={ChartLineData01Icon}
							tone={summary.kpis.netCashFlow >= 0 ? "default" : "danger"}
						/>
						<MetricCard
							title="Por cobrar"
							value={currencyFormatter.format(
								summary.kpis.totalDebt + summary.kpis.loanDebt,
							)}
							icon={HandCoinsIcon}
							tone={
								summary.kpis.oldDebts || summary.kpis.overdueLoans
									? "warning"
									: "default"
							}
						/>
						<MetricCard
							title="Clientes activos"
							value={String(summary.kpis.activeCustomersCount)}
							icon={UserGroupIcon}
						/>
					</div>

					<div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
						<IncomeChart data={summary.dailyCashFlow} />

						<Card className="overflow-hidden">
							<CardHeader className="pb-2">
								<CardTitle className="text-base font-semibold">
									Resumen de cartera
								</CardTitle>
								<p className="text-sm text-muted-foreground">
									Estado de fiados y préstamos
								</p>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-center py-4">
									<div className="relative grid size-36 place-items-center rounded-full border-8 border-primary/20">
										<div className="text-center">
											<p className="text-xl font-semibold">
												{compactCurrencyFormatter.format(
													summary.kpis.totalDebt + summary.kpis.loanDebt,
												)}
											</p>
											<p className="text-xs text-muted-foreground">total</p>
										</div>
									</div>
								</div>
								<div className="space-y-3">
									<div className="flex items-center justify-between text-sm">
										<span className="flex items-center gap-2 text-muted-foreground">
											<span className="inline-block size-2 rounded-full bg-primary" />
											Fiados
										</span>
										<strong className="tabular-nums">
											{currencyFormatter.format(summary.kpis.totalDebt)}
										</strong>
									</div>
									<div className="flex items-center justify-between text-sm">
										<span className="flex items-center gap-2 text-muted-foreground">
											<span className="inline-block size-2 rounded-full bg-[var(--chart-2)]" />
											Préstamos
										</span>
										<strong className="tabular-nums">
											{currencyFormatter.format(summary.kpis.loanDebt)}
										</strong>
									</div>
									<div className="flex items-center justify-between border-t pt-3 text-sm">
										<span className="text-muted-foreground">
											Clientes con saldo
										</span>
										<strong className="text-right text-xs tabular-nums">
											{summary.kpis.customersWithDebt} fiados ·{" "}
											{summary.kpis.loansWithDebt} préstamos
										</strong>
									</div>
								</div>
								<Button
									variant="outline"
									className="w-full"
									size="sm"
									render={<Link href={`/dashboard/${businessId}/cartera`} />}
								>
									Ver cartera completa
								</Button>
							</CardContent>
						</Card>
					</div>
				</>
			)}
		</div>
	);
}
