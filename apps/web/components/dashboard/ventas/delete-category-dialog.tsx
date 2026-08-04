"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useDeactivateCategory } from "@/lib/queries/categories";
import type { CashMovementCategory } from "@/lib/categories-api";

export function DeactivateCategoryDialog({
	businessId,
	category,
	open,
	onOpenChange,
}: {
	businessId: string;
	category: CashMovementCategory | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const mutation = useDeactivateCategory(businessId);

	async function onConfirm() {
		if (!category) return;
		try {
			await mutation.mutateAsync(category.id);
			onOpenChange(false);
			toast.add({
				type: "success",
				title: "Categoría desactivada",
				description: `${category.name} ya no aparecerá en los selectores.`,
			});
		} catch (cause) {
			toast.add({
				type: "error",
				title: "No pudimos desactivar la categoría",
				description:
					cause instanceof Error
						? cause.message
						: "Inténtalo nuevamente en unos segundos.",
				priority: "high",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Desactivar categoría</DialogTitle>
					<DialogDescription>
						La categoría <strong>{category?.name}</strong> dejará de aparecer en
						el selector de ventas. No se eliminará de los movimientos
						existentes.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Volver
					</Button>
					<Button
						variant="destructive"
						disabled={mutation.isPending}
						onClick={() => void onConfirm()}
					>
						{mutation.isPending ? "Desactivando…" : "Desactivar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
