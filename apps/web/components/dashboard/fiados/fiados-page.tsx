"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
	ArrowRight01Icon,
	ArrowUpDownIcon,
	Clock01Icon,
	PlusSignIcon,
	Search01Icon,
	TelephoneIcon,
	UserAdd01Icon,
	UserMultipleIcon,
	UserWarning01Icon,
	Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { cn } from "@/lib/utils";
import { useCreditSummary, useCustomers } from "@/lib/queries/fiados";
import type { Customer } from "@/lib/fiados-api";
import { CreateCreditDialog } from "./create-credit-dialog";
import { CustomerDetail } from "./customer-detail";

const FILTERS = [
	["all", "Todos"],
	["debt", "Con deuda"],
	["clear", "Sin deuda"],
	["old", "Antiguas"],
] as const;

type FilterValue = (typeof FILTERS)[number][0];

const money = (value: number) =>
	new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0,
	}).format(value);

function initials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
}

export function FiadosPage({ businessId }: { businessId: string }) {
	const customersQuery = useCustomers(businessId);
	const summaryQuery = useCreditSummary(businessId);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<FilterValue>("all");
	const [sort, setSort] = useState<"debt" | "name">("debt");
	const [createOpen, setCreateOpen] = useState(false);
	const [detail, setDetail] = useState<Customer | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [initialCustomer, setInitialCustomer] = useState<Customer | null>(null);
	const customers = useMemo(
		() => customersQuery.data ?? [],
		[customersQuery.data],
	);
	const filtered = useMemo(
		() =>
			customers
				.filter((customer) => {
					const query = search.trim().toLocaleLowerCase();
					const matches =
						!query ||
						customer.name.toLocaleLowerCase().includes(query) ||
						customer.phone?.toLocaleLowerCase().includes(query);
					const matchesFilter =
						filter === "all" ||
						(filter === "debt" && customer.totalDebt > 0) ||
						(filter === "clear" && customer.totalDebt === 0) ||
						(filter === "old" && customer.oldDebt);
					return matches && matchesFilter;
				})
				.sort((a, b) =>
					sort === "name"
						? a.name.localeCompare(b.name)
						: b.totalDebt - a.totalDebt,
				),
		[customers, filter, search, sort],
	);
	const maxDebt = Math.max(
		0,
		...filtered.map((customer) => customer.totalDebt),
	);

	function openDetail(customer: Customer) {
		setDetail(customer);
		setDetailOpen(true);
	}

	function newCredit(customer?: Customer) {
		setInitialCustomer(customer ?? null);
		setCreateOpen(true);
	}

	if (customersQuery.isLoading || summaryQuery.isLoading)
		return <OikentraLoader label="Cargando fiados" className="min-h-[60vh]" />;
	if (customersQuery.error || summaryQuery.error)
		return (
			<div className="mx-auto max-w-lg py-20 text-center">
				<p className="text-muted-foreground">No pudimos cargar tus fiados.</p>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => {
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
		<div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-sm font-medium text-primary">Control de deudas</p>
					<h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
						Fiados
					</h1>
					<p className="mt-1.5 max-w-md text-muted-foreground text-pretty">
						Mira quién te debe y registra sus pagos en segundos.
					</p>
				</div>
				<Button size="lg" className="rounded-xl" onClick={() => newCredit()}>
					<HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
					Nuevo fiado
				</Button>
			</div>

			<div className="mt-6 grid gap-3 md:grid-cols-3">
				<div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground md:col-span-2">
					<div
						className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-primary-foreground/10 blur-2xl"
						aria-hidden="true"
					/>
					<div className="relative flex items-center gap-2">
						<HugeiconsIcon icon={Wallet01Icon} size={16} aria-hidden="true" />
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

			<div className="mt-6 rounded-3xl border bg-card p-4 sm:p-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="font-semibold tracking-tight">Tus clientes</h2>
						<p className="text-sm text-muted-foreground">
							Ordenados por cuánto deben.
						</p>
					</div>
					<div className="relative w-full sm:max-w-xs">
						<HugeiconsIcon
							icon={Search01Icon}
							size={16}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							className="rounded-xl pl-9"
							placeholder="Buscar cliente"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap items-center gap-2">
					{FILTERS.map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => setFilter(value)}
							className={cn(
								"rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
								filter === value
									? "bg-foreground text-background"
									: "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
							)}
						>
							{label}
						</button>
					))}
					<button
						type="button"
						onClick={() => setSort(sort === "debt" ? "name" : "debt")}
						className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<HugeiconsIcon
							icon={ArrowUpDownIcon}
							size={14}
							aria-hidden="true"
						/>
						{sort === "debt" ? "Por nombre" : "Por deuda"}
					</button>
				</div>

				<div className="mt-4">
					{!customers.length ? (
						<div className="rounded-2xl border border-dashed py-14 text-center">
							<HugeiconsIcon
								icon={UserAdd01Icon}
								size={28}
								className="mx-auto text-muted-foreground"
								aria-hidden="true"
							/>
							<h3 className="mt-3 font-medium">Aún no tienes clientes</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Crea primero un cliente desde la sección Clientes.
							</p>
							<Button
								className="mt-4 rounded-xl"
								render={<Link href={`/dashboard/${businessId}/clientes`} />}
							>
								Ir a Clientes
							</Button>
						</div>
					) : !filtered.length ? (
						<div className="rounded-2xl border border-dashed py-14 text-center">
							<HugeiconsIcon
								icon={Search01Icon}
								size={28}
								className="mx-auto text-muted-foreground"
								aria-hidden="true"
							/>
							<p className="mt-3 text-sm text-muted-foreground">
								No encontramos clientes con ese filtro.
							</p>
						</div>
					) : (
						<div className="flex flex-col gap-2.5">
							{filtered.map((customer) => (
								<CustomerRow
									key={customer.id}
									customer={customer}
									maxDebt={maxDebt}
									onOpen={openDetail}
									onNewCredit={newCredit}
								/>
							))}
						</div>
					)}
				</div>
			</div>
			<CreateCreditDialog
				key={`${createOpen}-${initialCustomer?.id ?? "new"}`}
				businessId={businessId}
				customers={customers}
				open={createOpen}
				initialCustomer={initialCustomer}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setInitialCustomer(null);
				}}
			/>
			<CustomerDetail
				businessId={businessId}
				customer={detail}
				open={detailOpen}
				onOpenChange={setDetailOpen}
				onNewCredit={() => {
					setDetailOpen(false);
					newCredit(detail ?? undefined);
				}}
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

function CustomerRow({
	customer,
	maxDebt,
	onOpen,
	onNewCredit,
}: {
	customer: Customer;
	maxDebt: number;
	onOpen: (customer: Customer) => void;
	onNewCredit: (customer: Customer) => void;
}) {
	const hasDebt = customer.totalDebt > 0;
	const isOld = customer.oldDebt;
	const share =
		maxDebt > 0 ? Math.max(6, (customer.totalDebt / maxDebt) * 100) : 0;

	return (
		<div className="group relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 sm:flex-row sm:items-center sm:gap-5">
			<button
				type="button"
				onClick={() => onOpen(customer)}
				className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
			>
				<span
					className={cn(
						"grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold ring-1 ring-inset transition-colors",
						hasDebt
							? "bg-primary/10 text-primary ring-primary/20"
							: "bg-muted text-muted-foreground ring-border",
					)}
					aria-hidden="true"
				>
					{initials(customer.name)}
				</span>
				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-2">
						<span className="truncate font-medium tracking-tight group-hover:text-primary">
							{customer.name}
						</span>
						{isOld && hasDebt ? (
							<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
								<HugeiconsIcon
									icon={Clock01Icon}
									size={12}
									aria-hidden="true"
								/>
								Antigua
							</span>
						) : null}
					</span>
					<span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
						<HugeiconsIcon
							icon={TelephoneIcon}
							size={14}
							className="shrink-0"
							aria-hidden="true"
						/>
						<span className="truncate">
							{customer.phone || "Sin teléfono"}
							{" · "}
							{customer.activeCredits} fiado
							{customer.activeCredits === 1 ? "" : "s"}
						</span>
					</span>
					{hasDebt ? (
						<span className="mt-2 flex h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-muted">
							<span
								className={cn(
									"h-full rounded-full",
									isOld ? "bg-destructive" : "bg-primary",
								)}
								style={{ width: `${share}%` }}
							/>
						</span>
					) : null}
				</span>
			</button>

			<div className="flex items-center justify-between gap-3 sm:justify-end">
				<div className="text-right sm:min-w-28">
					{hasDebt ? (
						<>
							<p className="text-lg font-semibold tracking-tight tabular-nums">
								{money(customer.totalDebt)}
							</p>
							<p className="text-xs text-muted-foreground">pendiente</p>
						</>
					) : (
						<span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
							Al día
						</span>
					)}
				</div>
				{hasDebt ? (
					<Button
						size="sm"
						className="rounded-xl"
						onClick={() => onOpen(customer)}
					>
						Ver y abonar
						<HugeiconsIcon
							icon={ArrowRight01Icon}
							size={16}
							aria-hidden="true"
						/>
					</Button>
				) : (
					<Button
						size="sm"
						variant="outline"
						className="rounded-xl"
						onClick={() => onNewCredit(customer)}
					>
						Nuevo fiado
					</Button>
				)}
			</div>
		</div>
	);
}
