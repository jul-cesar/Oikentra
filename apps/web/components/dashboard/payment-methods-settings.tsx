"use client";

import { useState } from "react";
import {
	CreditCardIcon,
	Delete02Icon,
	PlusSignIcon,
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
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { PaymentMethod } from "@/lib/payment-methods-api";
import {
	useCreatePaymentMethod,
	useDeactivatePaymentMethod,
	usePaymentMethods,
} from "@/lib/queries/payment-methods";

export function PaymentMethodsSettings({ businessId }: { businessId: string }) {
	const methodsQuery = usePaymentMethods(businessId);
	const create = useCreatePaymentMethod(businessId);
	const deactivate = useDeactivatePaymentMethod(businessId);
	const [name, setName] = useState("");
	const [deactivateTarget, setDeactivateTarget] =
		useState<PaymentMethod | null>(null);

	async function createMethod(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		try {
			await create.mutateAsync({ name: trimmed });
			setName("");
			toast.add({
				type: "success",
				title: "Medio de pago creado",
				description: `${trimmed} ya está disponible al crear ventas.`,
			});
		} catch (cause) {
			toast.add({
				type: "error",
				title: "No pudimos crear el medio de pago",
				description:
					cause instanceof Error
						? cause.message
						: "Inténtalo nuevamente en unos segundos.",
				priority: "high",
			});
		}
	}

	async function deactivateMethod() {
		if (!deactivateTarget) return;
		const target = deactivateTarget;
		try {
			await deactivate.mutateAsync(target.id);
			setDeactivateTarget(null);
			toast.add({
				type: "success",
				title: "Medio de pago desactivado",
				description: `${target.name} ya no aparecerá al crear ventas.`,
			});
		} catch (cause) {
			toast.add({
				type: "error",
				title: "No pudimos desactivar el medio de pago",
				description:
					cause instanceof Error
						? cause.message
						: "Inténtalo nuevamente en unos segundos.",
				priority: "high",
			});
		}
	}

	const methods = methodsQuery.data ?? [];

	return (
		<Card className="overflow-hidden">
			<CardHeader className="gap-2">
				<div className="flex items-start gap-3">
					<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
						<HugeiconsIcon icon={CreditCardIcon} size={18} aria-hidden="true" />
					</span>
					<div>
						<CardTitle>Medios de pago</CardTitle>
						<CardDescription className="mt-1 text-pretty">
							Define las opciones que aparecen al registrar una venta.
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<form
					className="flex flex-col gap-2 sm:flex-row"
					onSubmit={createMethod}
				>
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Ej. Nequi, Daviplata, QR"
					/>
					<Button type="submit" disabled={create.isPending || !name.trim()}>
						<HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
						Agregar
					</Button>
				</form>

				<div className="space-y-2">
					{methods.map((method) => (
						<div
							key={method.id}
							className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3 text-sm"
						>
							<div className="min-w-0">
								<p className="truncate font-medium">{method.name}</p>
								<p className="text-xs text-muted-foreground">
									Activo para ventas
								</p>
							</div>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => setDeactivateTarget(method)}
							>
								<HugeiconsIcon
									icon={Delete02Icon}
									size={15}
									aria-hidden="true"
								/>
								Desactivar
							</Button>
						</div>
					))}
					{!methods.length && !methodsQuery.isLoading ? (
						<p className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
							Aún no hay medios de pago activos.
						</p>
					) : null}
				</div>
			</CardContent>

			<Dialog
				open={Boolean(deactivateTarget)}
				onOpenChange={(open) => !open && setDeactivateTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Desactivar medio de pago</DialogTitle>
						<DialogDescription>
							{deactivateTarget?.name} dejará de aparecer al crear ventas. Las
							ventas anteriores conservan el medio registrado.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeactivateTarget(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							disabled={deactivate.isPending}
							onClick={() => void deactivateMethod()}
						>
							{deactivate.isPending ? "Desactivando…" : "Desactivar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
