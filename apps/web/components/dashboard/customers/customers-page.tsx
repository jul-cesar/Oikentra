"use client";

import { useMemo, useState } from "react";
import {
	UserAdd01Icon,
	Search01Icon,
	PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useCustomers, useDeleteCustomer } from "@/lib/queries/fiados";
import type { Customer } from "@/lib/fiados-api";
import { CreateCustomerDialog } from "./create-customer-dialog";

const money = (value: number) =>
	new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0,
	}).format(value);

export function CustomersPage({ businessId }: { businessId: string }) {
	const query = useCustomers(businessId);
	const remove = useDeleteCustomer(businessId);
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<Customer | null>(null);
	const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(
		null,
	);
	const customers = useMemo(
		() =>
			(query.data ?? []).filter((customer) =>
				customer.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
			),
		[query.data, search],
	);

	function openCreate() {
		setEditing(null);
		setDialogOpen(true);
	}
	function openEdit(customer: Customer) {
		setEditing(customer);
		setDialogOpen(true);
	}
	async function deactivate(customer: Customer) {
		try {
			await remove.mutateAsync(customer.id);
			setDeactivateTarget(null);
			toast.add({
				type: "success",
				title: "Cliente desactivado",
				description: `${customer.name} ya no podrá recibir nuevos fiados.`,
			});
		} catch (cause) {
			toast.add({
				type: "error",
				title: "No pudimos desactivar el cliente",
				description:
					cause instanceof Error
						? cause.message
						: "Inténtalo nuevamente en unos segundos.",
				priority: "high",
			});
		}
	}

	if (query.isLoading)
		return (
			<OikentraLoader label="Cargando clientes" className="min-h-[60vh]" />
		);
	if (query.error)
		return (
			<div className="mx-auto max-w-lg py-20 text-center">
				<p className="text-muted-foreground">No pudimos cargar tus clientes.</p>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => void query.refetch()}
				>
					Reintentar
				</Button>
			</div>
		);

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<p className="text-sm font-medium">Catálogo de clientes</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight">
						Clientes
					</h1>
					<p className="mt-2 text-muted-foreground">
						Administra sus datos y consulta un resumen de sus fiados.
					</p>
				</div>
				<Button onClick={openCreate}>
					<HugeiconsIcon icon={UserAdd01Icon} size={18} />
					Nuevo cliente
				</Button>
			</div>
			<Card>
				<CardHeader className="gap-4">
					<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
						<div>
							<CardTitle>Tu lista de clientes</CardTitle>
							<CardDescription>
								{customers.length} cliente{customers.length === 1 ? "" : "s"}
							</CardDescription>
						</div>
						<div className="relative w-full sm:max-w-xs">
							<HugeiconsIcon
								icon={Search01Icon}
								size={17}
								className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								className="pl-9"
								placeholder="Buscar cliente"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{!customers.length ? (
						<div className="py-12 text-center">
							<HugeiconsIcon
								icon={UserAdd01Icon}
								size={32}
								className="mx-auto text-muted-foreground"
							/>
							<h3 className="mt-3 font-medium">Aún no tienes clientes</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Crea el primero para registrarle un fiado.
							</p>
							<Button className="mt-4" onClick={openCreate}>
								Crear cliente
							</Button>
						</div>
					) : (
						<div className="divide-y">
							{customers.map((customer) => (
								<div
									key={customer.id}
									className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
								>
									<div>
										<p className="font-medium">{customer.name}</p>
										<p className="text-sm text-muted-foreground">
											{customer.phone || "Sin teléfono"}
											{customer.notes ? ` · ${customer.notes}` : ""}
										</p>
									</div>
									<div className="flex items-center justify-between gap-4 sm:justify-end">
										<div className="text-left sm:text-right">
											<p
												className={
													customer.totalDebt
														? "font-semibold"
														: "text-muted-foreground"
												}
											>
												{customer.totalDebt
													? money(customer.totalDebt)
													: "Al día"}
											</p>
											<p className="text-xs text-muted-foreground">
												{customer.activeCredits} fiado
												{customer.activeCredits === 1 ? "" : "s"}
											</p>
										</div>
										<Button
											size="sm"
											variant="outline"
											onClick={() => openEdit(customer)}
										>
											<HugeiconsIcon icon={PencilEdit01Icon} size={15} />
											Editar
										</Button>
										<Button
											size="sm"
											variant="ghost"
											disabled={remove.isPending}
											onClick={() => setDeactivateTarget(customer)}
										>
											Desactivar
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
			<CreateCustomerDialog
				businessId={businessId}
				customer={editing}
				open={dialogOpen}
				onOpenChange={(open) => {
					setDialogOpen(open);
					if (!open) setEditing(null);
				}}
			/>
			<Dialog
				open={Boolean(deactivateTarget)}
				onOpenChange={(open) => !open && setDeactivateTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Desactivar cliente</DialogTitle>
						<DialogDescription>
							{deactivateTarget?.name} ya no podrá recibir nuevos fiados. Sus
							registros anteriores se conservan para consulta.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeactivateTarget(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							disabled={remove.isPending || !deactivateTarget}
							onClick={() =>
								deactivateTarget && void deactivate(deactivateTarget)
							}
						>
							{remove.isPending ? "Desactivando…" : "Desactivar cliente"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
