"use client";

import { useMemo, useState } from "react";
import {
	ArrowRight01Icon,
	ArrowUpDownIcon,
	BankIcon,
	HandCoinsIcon,
	PlusSignIcon,
	Search01Icon,
	UserMultipleIcon,
	UserWarning01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { cn } from "@/lib/utils";
import { useLoans, useLoanSummary } from "@/lib/queries/loans";
import { useCustomers } from "@/lib/queries/fiados";
import type { Loan } from "@/lib/loans-api";
import { CreateLoanDialog } from "./create-loan-dialog";
import { CreatePaymentDialog } from "./create-payment-dialog";
import { CancelDialog } from "./cancel-dialog";
import { LoanDetail } from "./loan-detail";

const STATUS_FILTERS: [Loan["status"] | "ALL", string][] = [
	["ALL", "Todos"],
	["ACTIVE", "Activos"],
	["PAID", "Pagados"],
	["CANCELLED", "Anulados"],
];

const STATUS_CONFIG = {
	ACTIVE: {
		label: "Activo",
		badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	},
	PAID: {
		label: "Pagado",
		badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	},
	DEFAULT: {
		label: "En mora",
		badge: "bg-destructive/10 text-destructive",
	},
	CANCELLED: {
		label: "Anulado",
		badge: "bg-muted text-muted-foreground",
	},
} as const;

const money = (value: number) =>
	new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0,
	}).format(value);

const age = (date: string) =>
	Math.max(
		0,
		Math.floor(
			(Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / 86400000,
		),
	);

function initials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
}

export function PrestamosPage({ businessId }: { businessId: string }) {
	const loansQuery = useLoans(businessId);
	const customersQuery = useCustomers(businessId);
	const summaryQuery = useLoanSummary(businessId);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<Loan["status"] | "ALL">("ALL");
	const [sort, setSort] = useState<"debt" | "name">("debt");
	const [createOpen, setCreateOpen] = useState(false);
	const [detail, setDetail] = useState<Loan | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [paymentTarget, setPaymentTarget] = useState<Loan | null>(null);
	const [cancelTarget, setCancelTarget] = useState<{
		loanId: string;
		paymentId?: string;
	} | null>(null);

	const loans = useMemo(() => loansQuery.data ?? [], [loansQuery.data]);
	const customerNames = useMemo(() => {
		const map = new Map<string, string>();
		for (const customer of customersQuery.data ?? []) {
			map.set(customer.id, customer.name);
		}
		return map;
	}, [customersQuery.data]);
	const customerPhones = useMemo(() => {
		const map = new Map<string, string>();
		for (const customer of customersQuery.data ?? []) {
			map.set(customer.id, customer.phone ?? "");
		}
		return map;
	}, [customersQuery.data]);

	const filtered = useMemo(
		() =>
			loans
				.filter((loan) => {
					const matchesStatus =
						statusFilter === "ALL" || loan.status === statusFilter;
					if (!matchesStatus) return false;
					const query = search.trim().toLocaleLowerCase();
					if (!query) return true;
					return (
						(customerNames.get(loan.customerId) ?? "")
							.toLocaleLowerCase()
							.includes(query) ||
						(customerPhones.get(loan.customerId) ?? "")
							.toLocaleLowerCase()
							.includes(query)
					);
				})
				.sort((a, b) =>
					sort === "name"
						? (customerNames.get(a.customerId) ?? "").localeCompare(
								customerNames.get(b.customerId) ?? "",
							)
						: b.remainingAmount - a.remainingAmount,
				),
		[customerNames, customerPhones, loans, search, sort, statusFilter],
	);

	if (loansQuery.isLoading || customersQuery.isLoading || summaryQuery.isLoading)
		return (
			<OikentraLoader label="Cargando préstamos" className="min-h-[60vh]" />
		);
	if (loansQuery.error || customersQuery.error || summaryQuery.error)
		return (
			<div className="mx-auto max-w-lg py-20 text-center">
				<p className="text-muted-foreground">
					No pudimos cargar tus préstamos.
				</p>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => {
						void loansQuery.refetch();
						void customersQuery.refetch();
						void summaryQuery.refetch();
					}}
				>
					Reintentar
				</Button>
			</div>
		);
	const summary = summaryQuery.data ?? {
		totalDebt: 0,
		customersWithDebt: 0,
		overdueLoans: 0,
	};
	return (
		<div className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-4 sm:py-8">
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<p className="text-sm font-medium text-primary">
						Control de cartera
					</p>
					<h1 className="mt-1 text-balance text-3xl font-semibold tracking-tight">
						Préstamos
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Administra todos los préstamos de tu negocio en un solo lugar.
					</p>
				</div>
				<Button size="lg" className="rounded-xl" onClick={() => setCreateOpen(true)}>
					<HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
					Nuevo préstamo
				</Button>
			</div>

			<div className="grid gap-3 md:grid-cols-3">
				<div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground md:col-span-2">
					<div
						className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-primary-foreground/10 blur-2xl"
						aria-hidden="true"
					/>
					<div className="relative flex items-center gap-2">
						<HugeiconsIcon icon={BankIcon} size={16} aria-hidden="true" />
						<span className="text-sm font-medium opacity-90">
							Me deben en total
						</span>
					</div>
					<p className="relative mt-3 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
						{money(summary.totalDebt)}
					</p>
					<p className="relative mt-2 text-sm opacity-80">
						{summary.customersWithDebt} cliente
						{summary.customersWithDebt === 1 ? "" : "s"} con saldo pendiente
					</p>
				</div>
				<div className="grid gap-3">
					<MiniStat
						icon={<HugeiconsIcon icon={UserMultipleIcon} size={16} />}
						label="Clientes con deuda"
						value={String(summary.customersWithDebt)}
					/>
					<MiniStat
						icon={<HugeiconsIcon icon={UserWarning01Icon} size={16} />}
						label="Préstamos vencidos"
						value={String(summary.overdueLoans)}
						hint="después del vencimiento"
						tone="warning"
					/>
				</div>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex gap-1 rounded-full bg-muted p-1">
					{STATUS_FILTERS.map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => setStatusFilter(value)}
							className={cn(
								"flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:px-4 sm:text-sm",
								statusFilter === value
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{label}
						</button>
					))}
				</div>
				<div className="flex w-full items-center gap-2 sm:w-auto">
					<div className="relative w-full flex-1 sm:w-64">
						<HugeiconsIcon
							icon={Search01Icon}
							size={16}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							className="rounded-full pl-9"
							placeholder="Buscar cliente"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>
					<button
						type="button"
						onClick={() => setSort(sort === "debt" ? "name" : "debt")}
						className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<HugeiconsIcon
							icon={ArrowUpDownIcon}
							size={14}
							aria-hidden="true"
						/>
						{sort === "debt" ? "Por nombre" : "Por deuda"}
					</button>
				</div>
			</div>

			{!loans.length ? (
				<div className="rounded-2xl border border-dashed py-16 text-center">
					<HugeiconsIcon
						icon={BankIcon}
						size={32}
						className="mx-auto text-muted-foreground"
						aria-hidden="true"
					/>
					<h3 className="mt-3 font-medium">Aún no hay préstamos</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Registra un préstamo para empezar a controlar la cartera.
					</p>
					<Button className="mt-4" onClick={() => setCreateOpen(true)}>
						Registrar préstamo
					</Button>
				</div>
			) : !filtered.length ? (
				<div className="rounded-2xl border border-dashed py-16 text-center">
					<HugeiconsIcon
						icon={Search01Icon}
						size={32}
						className="mx-auto text-muted-foreground"
						aria-hidden="true"
					/>
					<h3 className="mt-3 font-medium">No encontramos préstamos</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Prueba con otra búsqueda o filtro.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-2.5">
					{filtered.map((loan) => (
						<LoanRow
							key={loan.id}
							loan={loan}
							customerName={customerNames.get(loan.customerId) ?? "Cliente"}
							onOpen={() => {
								setDetail(loan);
								setDetailOpen(true);
							}}
							onPayment={() => setPaymentTarget(loan)}
							onCancel={() => setCancelTarget({ loanId: loan.id })}
						/>
					))}
				</div>
			)}

			<CreateLoanDialog
				key={String(createOpen)}
				businessId={businessId}
				customers={customersQuery.data ?? []}
				open={createOpen}
				onOpenChange={setCreateOpen}
			/>
			<CreatePaymentDialog
				key={`${Boolean(paymentTarget)}-${paymentTarget?.id ?? "new"}`}
				businessId={businessId}
				loan={paymentTarget}
				open={Boolean(paymentTarget)}
				onOpenChange={(value) => {
					if (!value) setPaymentTarget(null);
				}}
			/>
			<CancelDialog
				businessId={businessId}
				type="loan"
				loanId={cancelTarget?.loanId ?? ""}
				open={Boolean(cancelTarget)}
				onOpenChange={(value) => {
					if (!value) setCancelTarget(null);
				}}
			/>
			<LoanDetail
				businessId={businessId}
				loan={detail}
				customerName={
					detail ? customerNames.get(detail.customerId) ?? "Cliente" : ""
				}
				open={detailOpen}
				onOpenChange={setDetailOpen}
			/>
		</div>
	);
}

function MiniStat({
	icon,
	label,
	value,
	hint,
	tone = "default",
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	hint?: string;
	tone?: "default" | "warning";
}) {
	return (
		<div className="flex items-center gap-4 rounded-3xl border bg-card p-5">
			<span
				className={cn(
					"grid size-10 shrink-0 place-items-center rounded-xl",
					tone === "warning"
						? "bg-destructive/10 text-destructive"
						: "bg-primary/10 text-primary",
				)}
				aria-hidden="true"
			>
				{icon}
			</span>
			<div className="min-w-0">
				<p className="text-2xl font-semibold leading-none tracking-tight tabular-nums">
					{value}
				</p>
				<p className="mt-1.5 truncate text-xs text-muted-foreground">
					{hint ?? label}
				</p>
			</div>
		</div>
	);
}

function LoanRow({
	loan,
	customerName,
	onOpen,
	onPayment,
	onCancel,
}: {
	loan: Loan;
	customerName: string;
	onOpen: () => void;
	onPayment: () => void;
	onCancel: () => void;
}) {
	const config = STATUS_CONFIG[loan.status];
	const active = loan.status === "ACTIVE";
	const overdue = active && loan.installments.some(
		(installment) => installment.status === "OVERDUE",
	);
	return (
		<div className="group relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 sm:flex-row sm:items-center sm:gap-5">
			<button
				type="button"
				onClick={onOpen}
				className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
			>
				<span
					className={cn(
						"grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold ring-1 ring-inset",
						active
							? "bg-primary/10 text-primary ring-primary/20"
							: "bg-muted text-muted-foreground ring-border",
					)}
					aria-hidden="true"
				>
					{initials(customerName)}
				</span>
				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-2">
						<span className="truncate font-medium tracking-tight group-hover:text-primary">
							{customerName}
						</span>
						<span
							className={cn(
								"inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
								config.badge,
							)}
						>
							{config.label}
						</span>
						{overdue ? (
							<span className="inline-flex shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
								Vencido
							</span>
						) : null}
					</span>
					<span className="mt-0.5 block truncate text-sm text-muted-foreground">
						{loan.description || "Sin nota"}
					</span>
					<span className="mt-0.5 block text-xs text-muted-foreground">
						{loan.startDate} · vence {loan.dueDate} · {loan.termCount} cuota
						{loan.termCount === 1 ? "" : "s"} · {loan.payments.length} abono
						{loan.payments.length === 1 ? "" : "s"}
					</span>
				</span>
			</button>

			<div className="flex items-center justify-between gap-3 sm:justify-end">
				<div className="text-right sm:min-w-28">
					<p className="text-lg font-semibold tracking-tight tabular-nums">
						{money(loan.remainingAmount)}
					</p>
					<p className="text-xs text-muted-foreground">
						de {money(loan.totalAmount)}
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					{active ? (
						<Button
							size="sm"
							className="rounded-xl"
							onClick={onPayment}
						>
							<HugeiconsIcon icon={HandCoinsIcon} size={16} aria-hidden="true" />
							Abonar
						</Button>
					) : null}
					<Button size="sm" variant="outline" className="rounded-xl" onClick={onOpen}>
						Ver detalle
						<HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
					</Button>
					{active ? (
						<Button
							size="sm"
							variant="ghost"
							className="rounded-xl text-muted-foreground"
							onClick={onCancel}
						>
							Anular
						</Button>
					) : null}
				</div>
			</div>
		</div>
	);
}
