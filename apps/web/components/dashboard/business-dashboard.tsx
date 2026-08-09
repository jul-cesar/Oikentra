"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
	ArrowDownLeft01Icon,
	ArrowUpRight01Icon,
	ChartLineData01Icon,
	CreditCardIcon,
	PlusSignIcon,
	UserWarning01Icon,
	Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";

import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
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
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useSession } from "@/hooks/use-session";
import { saveActiveBusinessId } from "@/lib/onboarding-api";
import { useBusiness } from "@/lib/queries/onboarding";
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

const cashFlowConfig = {
	sales: { label: "Ventas", color: "var(--chart-1)" },
	expenses: { label: "Gastos", color: "var(--chart-3)" },
	creditPayments: { label: "Abonos", color: "var(--chart-4)" },
	net: { label: "Flujo neto", color: "var(--chart-2)" },
} satisfies ChartConfig;

const categoriesConfig = {
	amount: { label: "Monto", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function BusinessDashboard() {
	return (
		<AuthGuard>
			<BusinessDashboardContent />
		</AuthGuard>
	);
}

function BusinessDashboardContent() {
	const { user } = useSession();
	const params = useParams<{ businessId: string }>();
	const router = useRouter();
	const [period, setPeriod] = useState<Period>("7d");
	const range = useMemo(() => periodRange(period), [period]);
	const { data: business, isLoading, error } = useBusiness(params.businessId);
	const summaryQuery = useDashboardSummary(params.businessId, range);

	useEffect(() => {
		saveActiveBusinessId(params.businessId);
	}, [params.businessId]);

	if (error)
		return (
			<div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
				<p className="text-muted-foreground">{error.message}</p>
				<Button onClick={() => router.push("/dashboard")}>
					Volver a mis negocios
				</Button>
			</div>
		);
	if (isLoading || !business || !user)
		return (
			<OikentraLoader label="Cargando tu negocio" className="min-h-[60vh]" />
		);

	const summary = summaryQuery.data;

	return (
		<DashboardShell business={business} user={user}>
			<div className="mx-auto max-w-6xl space-y-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-sm font-medium text-primary">Estadísticas</p>
						<h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
							Buenos días, {user.name?.split(" ")[0] || "bienvenido"}
						</h1>
						<p className="mt-1.5 max-w-xl text-muted-foreground text-pretty">
							Señales rápidas de caja, cartera y comportamiento de ventas.
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
						<Button
							size="sm"
							render={<Link href={`/dashboard/${business.id}/ventas`} />}
						>
							<HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
							Nueva venta
						</Button>
					</div>
				</div>

				{summaryQuery.isLoading || !summary ? (
					<OikentraLoader label="Calculando resumen" className="min-h-[48vh]" />
				) : (
					<>
						<div className="grid gap-3 md:grid-cols-4">
							<MetricCard
								icon={<HugeiconsIcon icon={ArrowUpRight01Icon} size={16} />}
								label="Ventas del período"
								value={currencyFormatter.format(summary.kpis.salesAmount)}
								detail={`${summary.kpis.salesCount} venta${summary.kpis.salesCount === 1 ? "" : "s"}`}
							/>
							<MetricCard
								icon={<HugeiconsIcon icon={ArrowDownLeft01Icon} size={16} />}
								label="Gastos del período"
								value={currencyFormatter.format(summary.kpis.expensesAmount)}
								detail={`${summary.kpis.expensesCount} gasto${summary.kpis.expensesCount === 1 ? "" : "s"}`}
								tone="danger"
							/>
							<MetricCard
								icon={<HugeiconsIcon icon={Wallet01Icon} size={16} />}
								label="Flujo neto"
								value={currencyFormatter.format(summary.kpis.netCashFlow)}
								detail="Ventas - gastos"
								tone={summary.kpis.netCashFlow >= 0 ? "default" : "danger"}
							/>
							<MetricCard
								icon={<HugeiconsIcon icon={UserWarning01Icon} size={16} />}
								label="Cartera pendiente"
								value={currencyFormatter.format(summary.kpis.totalDebt)}
								detail={`${summary.kpis.customersWithDebt} cliente${summary.kpis.customersWithDebt === 1 ? "" : "s"} con saldo`}
								tone={summary.kpis.oldDebts ? "warning" : "default"}
							/>
						</div>

						<div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
							<CashFlowChart data={summary.dailyCashFlow} />
							<PaymentMethodsChart data={summary.paymentMethods} />
						</div>

						<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
							<TopCategoriesChart data={summary.topCategories} />
							<InsightsCard
								insights={summary.insights}
								averageSaleTicket={summary.kpis.averageSaleTicket}
								oldDebts={summary.kpis.oldDebts}
							/>
						</div>
					</>
				)}
			</div>
		</DashboardShell>
	);
}

function MetricCard({
	icon,
	label,
	value,
	detail,
	tone = "default",
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	detail: string;
	tone?: "default" | "danger" | "warning";
}) {
	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
						{icon}
					</span>
					{label}
				</div>
				<CardTitle
					className={
						tone === "danger"
							? "text-2xl text-destructive"
							: tone === "warning"
								? "text-2xl text-amber-600"
								: "text-2xl"
					}
				>
					{value}
				</CardTitle>
			</CardHeader>
			<CardContent className="text-xs text-muted-foreground">
				{detail}
			</CardContent>
		</Card>
	);
}

function CashFlowChart({
	data,
}: {
	data: {
		date: string;
		sales: number;
		expenses: number;
		creditPayments: number;
		net: number;
	}[];
}) {
	const chartData = data.map((item) => ({
		...item,
		label: dayFormatter.format(new Date(`${item.date}T00:00:00`)),
	}));

	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HugeiconsIcon icon={ChartLineData01Icon} size={18} />
					Flujo del período
				</CardTitle>
				<CardDescription>Entradas y salidas agregadas por día.</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={cashFlowConfig} className="h-[280px] w-full">
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
												{cashFlowConfig[
													String(name) as keyof typeof cashFlowConfig
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
							dataKey="sales"
							stackId="in"
							stroke="var(--color-sales)"
							fill="var(--color-sales)"
							fillOpacity={0.35}
						/>
						<Area
							type="monotone"
							dataKey="creditPayments"
							stackId="in"
							stroke="var(--color-creditPayments)"
							fill="var(--color-creditPayments)"
							fillOpacity={0.25}
						/>
						<Area
							type="monotone"
							dataKey="expenses"
							stroke="var(--color-expenses)"
							fill="var(--color-expenses)"
							fillOpacity={0.18}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

function PaymentMethodsChart({
	data,
}: {
	data: { name: string; amount: number; count: number; share: number }[];
}) {
	const chartData = data.map((item, index) => ({
		...item,
		fill: `var(--chart-${(index % 5) + 1})`,
	}));
	const config = Object.fromEntries(
		chartData.map((item, index) => [
			item.name,
			{ label: item.name, color: `var(--chart-${(index % 5) + 1})` },
		]),
	) satisfies ChartConfig;

	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HugeiconsIcon icon={CreditCardIcon} size={18} />
					Medios de pago
				</CardTitle>
				<CardDescription>Participación por monto vendido.</CardDescription>
			</CardHeader>
			<CardContent>
				{chartData.length ? (
					<div className="space-y-4">
						<ChartContainer
							config={config}
							className="mx-auto h-[220px] w-full max-w-xs"
						>
							<PieChart accessibilityLayer>
								<ChartTooltip
									content={
										<ChartTooltipContent
											nameKey="name"
											formatter={(value, name) => (
												<div className="flex flex-1 items-center justify-between gap-2 leading-none">
													<span className="text-muted-foreground">
														{String(name)}
													</span>
													<span className="font-mono font-medium text-foreground tabular-nums">
														{currencyFormatter.format(Number(value))}
													</span>
												</div>
											)}
										/>
									}
								/>
								<Pie
									data={chartData}
									dataKey="amount"
									nameKey="name"
									innerRadius={56}
									outerRadius={88}
									paddingAngle={2}
								>
									{chartData.map((entry) => (
										<Cell key={entry.name} fill={entry.fill} />
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
						<div className="grid gap-2 sm:grid-cols-2">
							{chartData.map((item) => (
								<div
									key={item.name}
									className="rounded-xl border bg-muted/20 px-3 py-2 text-sm"
								>
									<div className="flex items-center justify-between gap-3">
										<div className="flex min-w-0 items-center gap-2">
											<span
												className="size-3.5 shrink-0 rounded-sm ring-1 ring-border"
												style={{ backgroundColor: item.fill }}
											/>
											<span className="truncate font-medium">{item.name}</span>
										</div>
										<span className="shrink-0 font-semibold tabular-nums">
											{item.share}%
										</span>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{currencyFormatter.format(item.amount)} · {item.count} venta
										{item.count === 1 ? "" : "s"}
									</p>
								</div>
							))}
						</div>
					</div>
				) : (
					<EmptyChartState label="Aún no hay ventas con medio de pago." />
				)}
			</CardContent>
		</Card>
	);
}

function TopCategoriesChart({
	data,
}: {
	data: {
		name: string;
		type: "SALE" | "EXPENSE";
		amount: number;
		count: number;
	}[];
}) {
	const chartData = data.map((item) => ({
		...item,
		label: item.name.length > 16 ? `${item.name.slice(0, 16)}…` : item.name,
		fill: item.type === "EXPENSE" ? "var(--chart-3)" : "var(--chart-1)",
	}));

	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<CardTitle>Categorías que mueven caja</CardTitle>
				<CardDescription>Top ventas y gastos del período.</CardDescription>
			</CardHeader>
			<CardContent>
				{chartData.length ? (
					<ChartContainer
						config={categoriesConfig}
						className="h-[260px] w-full"
					>
						<BarChart
							accessibilityLayer
							data={chartData}
							layout="vertical"
							margin={{ left: 8, right: 16 }}
						>
							<CartesianGrid horizontal={false} />
							<XAxis type="number" hide />
							<YAxis
								dataKey="label"
								type="category"
								tickLine={false}
								axisLine={false}
								width={104}
								tickMargin={8}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										hideLabel
										formatter={(value, _name, item) => (
											<>
												<span className="text-muted-foreground">
													{item.payload.name}
												</span>
												<span className="ml-auto font-mono font-medium tabular-nums">
													{currencyFormatter.format(Number(value))}
												</span>
											</>
										)}
									/>
								}
							/>
							<Bar dataKey="amount" radius={6}>
								{chartData.map((entry) => (
									<Cell key={`${entry.type}-${entry.name}`} fill={entry.fill} />
								))}
							</Bar>
						</BarChart>
					</ChartContainer>
				) : (
					<EmptyChartState label="Aún no hay categorías con movimientos." />
				)}
			</CardContent>
		</Card>
	);
}

function InsightsCard({
	insights,
	averageSaleTicket,
	oldDebts,
}: {
	insights: {
		label: string;
		value: string;
		detail: string;
		tone: "success" | "warning" | "info";
	}[];
	averageSaleTicket: number;
	oldDebts: number;
}) {
	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<CardTitle>Lecturas rápidas</CardTitle>
				<CardDescription>
					Resumen sin repetir listados de otras pantallas.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3 sm:grid-cols-2">
				{insights.map((item) => (
					<div key={item.label} className="rounded-2xl border bg-card p-4">
						<p className="text-xs font-medium text-muted-foreground">
							{item.label}
						</p>
						<p className="mt-1 text-xl font-semibold tracking-tight">
							{item.value}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
					</div>
				))}
				<div className="rounded-2xl border bg-card p-4">
					<p className="text-xs font-medium text-muted-foreground">
						Ticket promedio
					</p>
					<p className="mt-1 text-xl font-semibold tracking-tight">
						{compactCurrencyFormatter.format(averageSaleTicket)}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Promedio por venta en el período.
					</p>
				</div>
				<div className="rounded-2xl border bg-card p-4">
					<p className="text-xs font-medium text-muted-foreground">
						Deudas antiguas
					</p>
					<p
						className={
							oldDebts
								? "mt-1 text-xl font-semibold tracking-tight text-amber-600"
								: "mt-1 text-xl font-semibold tracking-tight"
						}
					>
						{oldDebts}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Fiados pendientes con más de 15 días.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

function EmptyChartState({ label }: { label: string }) {
	return (
		<div className="grid h-[220px] place-items-center rounded-2xl border border-dashed text-center text-sm text-muted-foreground">
			{label}
		</div>
	);
}
