"use client";

import { useMemo, useState } from "react";
import {
	ArrowRight01Icon,
	Coins01Icon,
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
import { useCredits, useCreditSummary, useCustomers } from "@/lib/queries/fiados";
import type { Credit } from "@/lib/fiados-api";
import { CreateCreditDialog } from "./create-credit-dialog";
import { CreatePaymentDialog } from "./create-payment-dialog";
import { CancelDialog } from "./cancel-dialog";
import { CreditDetail } from "./credit-detail";

const STATUS_FILTERS: [Credit["status"] | "ALL", string][] = [
	["ALL", "Todos"],
	["PENDING", "Pendientes"],
	["PAID", "Pagados"],
	["CANCELLED", "Anulados"],
];

const STATUS_CONFIG = {
	PENDING: {
		label: "Pendiente",
		badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	},
	PAID: {
		label: "Pagado",
		badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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

export function CreditosPage({ businessId }: { businessId: string }) {
	const creditsQuery = useCredits(businessId);
	const customersQuery = useCustomers(businessId);
	const summaryQuery = useCreditSummary(businessId);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<Credit["status"] | "ALL">("ALL");
	const [createOpen, setCreateOpen] = useState(false);
	const [detail, setDetail] = useState<Credit | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [paymentTarget, setPaymentTarget] = useState<Credit | null>(null);
	const [cancelTarget, setCancelTarget] = useState<{
		creditId: string;
		paymentId?: string;
	} | null>(null);

	const credits = useMemo(() => creditsQuery.data ?? [], [creditsQuery.data]);
	const customerNames = useMemo(() => {
		const map = new Map<string, string>();
		for (const customer of customersQuery.data ?? []) {
			map.set(customer.id, customer.name);
		}
		return map;
	}, [customersQuery.data]);

	const filtered = useMemo(
		() =>
			credits.filter((credit) => {
				const matchesStatus =
					statusFilter === "ALL" || credit.status === statusFilter;
				if (!matchesStatus) return false;
				if (!search.trim()) return true;
				const term = search.trim().toLocaleLowerCase();
				return (
					customerNames
						.get(credit.customerId)
						?.toLocaleLowerCase()
						.includes(term) ||
					credit.description?.toLocaleLowerCase().includes(term) ||
					money(credit.originalAmount).includes(term)
				);
			}),
		[credits, customerNames, search, statusFilter],
	);

	if (creditsQuery.isLoading || customersQuery.isLoading || summaryQuery.isLoading)
		return (
			<OikentraLoader label="Cargando créditos" className="min-h-[60vh]" />
		);
	if (creditsQuery.error || customersQuery.error || summaryQuery.error)
		return (
			<div className="mx-auto max-w-lg py-20 text-center">
				<p className="text-muted-foreground">
					No pudimos cargar tus créditos.
				</p>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => {
						void creditsQuery.refetch();
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
		oldDebts: 0,
	};
	return (
		<div className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-4 sm:py-8">
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<p className="text-sm font-medium text-primary">
						Control de cartera
					</p>
					<h1 className="mt-1 text-balance text-3xl font-semibold tracking-tight">
						Créditos
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Administra todos los créditos de tu negocio en un solo lugar.
					</p>
				</div>
				<Button size="lg" className="rounded-xl" onClick={() => setCreateOpen(true)}>
					<HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
					Nuevo crédito
				</Button>
			</div>

			<div className="grid gap-3 md:grid-cols-3">
				<div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground md:col-span-2">
					<div
						className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-primary-foreground/10 blur-2xl"
						aria-hidden="true"
					/>
					<div className="relative flex items-center gap-2">
						<HugeiconsIcon icon={Coins01Icon} size={16} aria-hidden="true" />
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
						label="Deudas antiguas"
						value={String(summary.oldDebts)}
						hint="más de 15 días"
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
				<div className="relative w-full sm:w-64">
					<HugeiconsIcon
						icon={Search01Icon}
						size={16}
						className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input
						className="rounded-full pl-9"
						placeholder="Buscar crédito"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</div>
			</div>

			{!credits.length ? (
				<div className="rounded-2xl border border-dashed py-16 text-center">
					<HugeiconsIcon
						icon={Coins01Icon}
						size={32}
						className="mx-auto text-muted-foreground"
						aria-hidden="true"
					/>
					<h3 className="mt-3 font-medium">Aún no hay créditos</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Registra un crédito para empezar a controlar la cartera.
					</p>
					<Button className="mt-4" onClick={() => setCreateOpen(true)}>
						Registrar crédito
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
					<h3 className="mt-3 font-medium">No encontramos créditos</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Prueba con otra búsqueda o filtro.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-2.5">
					{filtered.map((credit) => (
						<CreditRow
							key={credit.id}
							credit={credit}
							customerName={customerNames.get(credit.customerId) ?? "Cliente"}
							onOpen={() => {
								setDetail(credit);
								setDetailOpen(true);
							}}
							onPayment={() => setPaymentTarget(credit)}
							onCancel={() => setCancelTarget({ creditId: credit.id })}
						/>
					))}
				</div>
			)}

			<CreateCreditDialog
				key={String(createOpen)}
				businessId={businessId}
				customers={customersQuery.data ?? []}
				open={createOpen}
				onOpenChange={setCreateOpen}
			/>
			<CreatePaymentDialog
				key={`${Boolean(paymentTarget)}-${paymentTarget?.id ?? "new"}`}
				businessId={businessId}
				credit={paymentTarget}
				open={Boolean(paymentTarget)}
				onOpenChange={(value) => {
					if (!value) setPaymentTarget(null);
				}}
			/>
			<CancelDialog
				businessId={businessId}
				type="credit"
				creditId={cancelTarget?.creditId ?? ""}
				open={Boolean(cancelTarget)}
				onOpenChange={(value) => {
					if (!value) setCancelTarget(null);
				}}
			/>
			<CreditDetail
				businessId={businessId}
				credit={detail}
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

function CreditRow({
	credit,
	customerName,
	onOpen,
	onPayment,
	onCancel,
}: {
	credit: Credit;
	customerName: string;
	onOpen: () => void;
	onPayment: () => void;
	onCancel: () => void;
}) {
	const config = STATUS_CONFIG[credit.status];
	const pending = credit.status === "PENDING";
	const old = pending && age(credit.creditDate) > 15;
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
						pending
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
						{old ? (
							<span className="inline-flex shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
								Antigua
							</span>
						) : null}
					</span>
					<span className="mt-0.5 block truncate text-sm text-muted-foreground">
						{credit.description || "Sin nota"}
					</span>
					<span className="mt-0.5 block text-xs text-muted-foreground">
						{credit.creditDate} · hace {age(credit.creditDate)} días ·{" "}
						{credit.payments.length} abono
						{credit.payments.length === 1 ? "" : "s"}
					</span>
				</span>
			</button>

			<div className="flex items-center justify-between gap-3 sm:justify-end">
				<div className="text-right sm:min-w-28">
					<p className="text-lg font-semibold tracking-tight tabular-nums">
						{money(credit.remainingAmount)}
					</p>
					<p className="text-xs text-muted-foreground">
						de {money(credit.originalAmount)}
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					{pending ? (
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
					{pending ? (
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
