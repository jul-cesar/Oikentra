"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
	ArrowDownLeft01Icon,
	ArrowUpRight01Icon,
	CashierIcon,
	ChartDecreaseIcon,
	ChartIncreaseIcon,
	HandCoinsIcon,
	PlusSignIcon,
	ReceiptTextIcon,
	Search01Icon,
	Tag01Icon,
	Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCashMovements } from "@/lib/queries/cash-movements";
import { useCategories } from "@/lib/queries/categories";
import type { CashMovement } from "@/lib/cash-movements-api";
import { CreateSaleDialog } from "./create-sale-dialog";
import { CreateExpenseDialog } from "./create-expense-dialog";
import { CancelMovementDialog } from "./cancel-movement-dialog";

type FilterType = "ALL" | "SALE" | "EXPENSE";

const CATEGORY_FILTER_ALL = "";

const FILTERS: [FilterType, string][] = [
	["ALL", "Todos"],
	["SALE", "Ingresos"],
	["EXPENSE", "Gastos"],
];

const MOVEMENT_CONFIG = {
	SALE: {
		label: "Venta",
		icon: ArrowUpRight01Icon,
		ring: "bg-primary/10 text-primary",
		sign: "+",
		amount: "text-foreground",
	},
	CREDIT_PAYMENT: {
		label: "Pago fiado",
		icon: HandCoinsIcon,
		ring: "bg-primary/10 text-primary",
		sign: "+",
		amount: "text-foreground",
	},
	EXPENSE: {
		label: "Gasto",
		icon: ArrowDownLeft01Icon,
		ring: "bg-destructive/10 text-destructive",
		sign: "-",
		amount: "text-destructive",
	},
} as const;

const money = (value: number) =>
	new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0,
	}).format(value);

function localDate(date: string) {
	return new Date(`${date}T00:00:00`);
}

function formatDayHeading(date: string) {
	const target = localDate(date);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);

	if (target.getTime() === today.getTime()) return "hoy";
	if (target.getTime() === yesterday.getTime()) return "ayer";

	return new Intl.DateTimeFormat("es-CO", {
		weekday: "long",
		day: "numeric",
		month: "long",
	}).format(target);
}

function formatTime(iso: string) {
	return new Intl.DateTimeFormat("es-CO", {
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(iso));
}

export function VentasPage({ businessId }: { businessId: string }) {
	const movementsQuery = useCashMovements(businessId);
	const categoriesQuery = useCategories(businessId);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
	const [categoryFilter, setCategoryFilter] = useState(CATEGORY_FILTER_ALL);
	const [createSaleOpen, setCreateSaleOpen] = useState(false);
	const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<CashMovement | null>(null);

	const movements = useMemo(
		() => movementsQuery.data ?? [],
		[movementsQuery.data],
	);

	const active = useMemo(
		() => movements.filter((movement) => movement.status === "ACTIVE"),
		[movements],
	);

	const categories = useMemo(
		() =>
			(categoriesQuery.data ?? []).filter(
				(category) => category.status === "ACTIVE",
			),
		[categoriesQuery.data],
	);

	const totalIn = useMemo(
		() =>
			active
				.filter((movement) => movement.type !== "EXPENSE")
				.reduce((sum, movement) => sum + movement.amount, 0),
		[active],
	);

	const totalOut = useMemo(
		() =>
			active
				.filter((movement) => movement.type === "EXPENSE")
				.reduce((sum, movement) => sum + movement.amount, 0),
		[active],
	);

	const net = totalIn - totalOut;

	const filtered = useMemo(() => {
		return movements.filter((movement) => {
			if (typeFilter === "SALE" && movement.type === "EXPENSE") return false;
			if (typeFilter === "EXPENSE" && movement.type !== "EXPENSE") return false;
			if (
				categoryFilter !== CATEGORY_FILTER_ALL &&
				movement.category !== categoryFilter
			) {
				return false;
			}
			if (!search.trim()) return true;
			const term = search.toLocaleLowerCase();
			return (
				movement.category?.toLocaleLowerCase().includes(term) ||
				movement.paymentMethod?.toLocaleLowerCase().includes(term) ||
				movement.note?.toLocaleLowerCase().includes(term) ||
				movement.sourceCustomer?.name.toLocaleLowerCase().includes(term) ||
				money(movement.amount).includes(term)
			);
		});
	}, [categoryFilter, movements, search, typeFilter]);

	const grouped = useMemo(() => {
		const map = new Map<string, CashMovement[]>();
		for (const movement of filtered) {
			const list = map.get(movement.businessDate) ?? [];
			list.push(movement);
			map.set(movement.businessDate, list);
		}
		return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
	}, [filtered]);

	function dayTotal(list: CashMovement[]) {
		return list
			.filter((movement) => movement.status === "ACTIVE")
			.reduce(
				(sum, movement) =>
					sum +
					(movement.type === "EXPENSE" ? -movement.amount : movement.amount),
				0,
			);
	}

	if (movementsQuery.isLoading)
		return (
			<OikentraLoader label="Cargando movimientos" className="min-h-[60vh]" />
		);

	if (movementsQuery.error)
		return (
			<div className="mx-auto max-w-lg py-20 text-center">
				<p className="text-muted-foreground">
					No pudimos cargar tus movimientos.
				</p>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => void movementsQuery.refetch()}
				>
					Reintentar
				</Button>
			</div>
		);

	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<p className="text-sm font-medium text-primary">Control de caja</p>
					<h1 className="mt-1 text-balance text-3xl font-semibold tracking-tight">
						Movimientos
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Ingresos, gastos y flujo de tu caja al día.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						size="sm"
						render={
							<Link href={`/dashboard/${businessId}/ventas/categorias`} />
						}
					>
						<HugeiconsIcon icon={Tag01Icon} size={16} aria-hidden="true" />
						Categorías
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setCreateExpenseOpen(true)}
					>
						<HugeiconsIcon
							icon={ChartDecreaseIcon}
							size={16}
							aria-hidden="true"
						/>
						Nuevo gasto
					</Button>
					<Button size="sm" onClick={() => setCreateSaleOpen(true)}>
						<HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
						Nueva venta
					</Button>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
				<div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground">
					<div
						className="pointer-events-none absolute -right-10 -top-12  rounded-full bg-primary-foreground/10 blur-2xl"
						aria-hidden="true"
					/>
					<div className="relative">
						<div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
							<HugeiconsIcon icon={Wallet01Icon} size={16} aria-hidden="true" />
							Flujo neto del período
						</div>
						<p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
							{money(net)}
						</p>
						<div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-primary-foreground/80">
							<span className="inline-flex items-center gap-1.5">
								<HugeiconsIcon
									icon={ChartIncreaseIcon}
									size={16}
									aria-hidden="true"
								/>
								{money(totalIn)} entradas
							</span>
							<span className="inline-flex items-center gap-1.5">
								<HugeiconsIcon
									icon={ChartDecreaseIcon}
									size={16}
									aria-hidden="true"
								/>
								{money(totalOut)} salidas
							</span>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
					<StatTile
						icon={
							<HugeiconsIcon
								icon={ChartIncreaseIcon}
								size={16}
								className="text-primary"
							/>
						}
						label="Ingresos"
						value={money(totalIn)}
						detail={`${active.filter((movement) => movement.type !== "EXPENSE").length} registros`}
					/>
					<StatTile
						icon={
							<HugeiconsIcon
								icon={ChartDecreaseIcon}
								size={16}
								className="text-destructive"
							/>
						}
						label="Gastos"
						value={money(totalOut)}
						detail={`${active.filter((movement) => movement.type === "EXPENSE").length} registros`}
					/>
				</div>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex gap-1 rounded-full bg-muted p-1">
					{FILTERS.map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => setTypeFilter(value)}
							className={cn(
								"rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
								typeFilter === value
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{label}
						</button>
					))}
				</div>
				<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
					<Select value={categoryFilter} onValueChange={setCategoryFilter}>
						<SelectTrigger className="rounded-full sm:w-56">
							<SelectValue placeholder="Todas las categorías" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={CATEGORY_FILTER_ALL}>
								Todas las categorías
							</SelectItem>
							{categories.map((category) => (
								<SelectItem key={category.id} value={category.name}>
									{category.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<div className="relative w-full sm:w-64">
						<HugeiconsIcon
							icon={Search01Icon}
							size={16}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							className="rounded-full pl-9"
							placeholder="Buscar movimiento"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>
				</div>
			</div>

			{!filtered.length ? (
				<div className="rounded-2xl border border-dashed py-16 text-center">
					<HugeiconsIcon
						icon={movements.length ? ReceiptTextIcon : CashierIcon}
						size={32}
						className="mx-auto text-muted-foreground"
						aria-hidden="true"
					/>
					<h3 className="mt-3 font-medium">
						{movements.length
							? "No encontramos movimientos"
							: "Aún no hay movimientos"}
					</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						{movements.length
							? "Prueba con otra búsqueda o filtro."
							: "Registra tu primer movimiento para empezar."}
					</p>
					{!movements.length ? (
						<Button className="mt-4" onClick={() => setCreateSaleOpen(true)}>
							Registrar movimiento
						</Button>
					) : null}
				</div>
			) : (
				<div className="space-y-6">
					{grouped.map(([date, list]) => {
						const total = dayTotal(list);
						return (
							<section key={date}>
								<div className="mb-1 flex items-center justify-between px-3">
									<h2 className="text-sm font-medium capitalize text-muted-foreground">
										{formatDayHeading(date)}
									</h2>
									<span
										className={cn(
											"text-sm font-semibold tabular-nums",
											total >= 0 ? "text-primary" : "text-destructive",
										)}
									>
										{total >= 0 ? "+" : "-"}
										{money(Math.abs(total))}
									</span>
								</div>
								<div className="rounded-2xl border bg-card p-1.5">
									{list.map((movement) => (
										<MovementRow
											key={movement.id}
											movement={movement}
											onCancel={setCancelTarget}
										/>
									))}
								</div>
							</section>
						);
					})}
				</div>
			)}

			<CreateSaleDialog
				businessId={businessId}
				open={createSaleOpen}
				onOpenChange={setCreateSaleOpen}
			/>
			<CreateExpenseDialog
				businessId={businessId}
				open={createExpenseOpen}
				onOpenChange={setCreateExpenseOpen}
			/>
			<CancelMovementDialog
				businessId={businessId}
				movement={cancelTarget}
				open={Boolean(cancelTarget)}
				onOpenChange={(value) => {
					if (!value) setCancelTarget(null);
				}}
			/>
		</div>
	);
}

function StatTile({
	icon,
	label,
	value,
	detail,
}: {
	icon: ReactNode;
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<div className="rounded-2xl border bg-card p-4">
			<div className="flex items-center gap-2">
				<span className="grid size-8 place-items-center rounded-lg bg-muted">
					{icon}
				</span>
				<span className="text-sm font-medium text-muted-foreground">
					{label}
				</span>
			</div>
			<p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
			<p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
		</div>
	);
}

function MovementRow({
	movement,
	onCancel,
}: {
	movement: CashMovement;
	onCancel: (movement: CashMovement) => void;
}) {
	const config = MOVEMENT_CONFIG[movement.type];
	const cancelled = movement.status === "CANCELLED";

	return (
		<div
			className={cn(
				"group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-muted/40",
				cancelled && "opacity-55",
			)}
		>
			<span
				className={cn(
					"grid size-10 shrink-0 place-items-center rounded-full",
					config.ring,
				)}
			>
				<HugeiconsIcon icon={config.icon} size={20} aria-hidden="true" />
			</span>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<p className="truncate text-sm font-medium text-foreground">
						{config.label}
					</p>
					{movement.category ? (
						<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
							{movement.category}
						</span>
					) : null}
					{movement.paymentMethod ? (
						<span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary sm:inline-flex">
							{movement.paymentMethod}
						</span>
					) : null}
					{movement.sourceCustomer ? (
						<span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary sm:inline-flex">
							{movement.sourceCustomer.name}
						</span>
					) : null}
				</div>
				<p className="mt-0.5 truncate text-xs text-muted-foreground">
					{movement.note ? `${movement.note} · ` : ""}
					{formatTime(movement.occurredAt)}
				</p>
			</div>

			<div className="flex shrink-0 flex-col items-end gap-1">
				<p
					className={cn(
						"text-base font-semibold tabular-nums",
						cancelled ? "text-muted-foreground line-through" : config.amount,
					)}
				>
					{config.sign}
					{money(movement.amount)}
				</p>
				{cancelled ? (
					<span className="text-xs text-muted-foreground">Anulado</span>
				) : (
					<Button
						size="sm"
						variant="ghost"
						className="h-6 px-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
						onClick={() => onCancel(movement)}
					>
						Anular
					</Button>
				)}
			</div>
		</div>
	);
}
