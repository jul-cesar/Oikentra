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
    } catch {
      // el error se maneja silenciosamente, la lista se refresca
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desactivar categoría</DialogTitle>
          <DialogDescription>
            La categoría{" "}
            <strong>{category?.name}</strong> dejará de aparecer en
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
            {mutation.isPending
              ? "Desactivando…"
              : "Desactivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
