"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { useCancelLoan, useCancelLoanPayment } from "@/lib/queries/loans";
import {
  cancelFormSchema,
  type CancelFormValues,
} from "@/lib/validation/loans-schemas";

export function CancelDialog({
  businessId,
  type,
  loanId,
  paymentId,
  open,
  onOpenChange,
}: {
  businessId: string;
  type: "loan" | "payment";
  loanId: string;
  paymentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const loanMutation = useCancelLoan(businessId);
  const paymentMutation = useCancelLoanPayment(businessId);
  const form = useForm<CancelFormValues>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: { reason: "" },
  });
  async function onSubmit(values: CancelFormValues) {
    try {
      if (type === "loan")
        await loanMutation.mutateAsync({ loanId, reason: values.reason });
      else if (paymentId)
        await paymentMutation.mutateAsync({
          loanId,
          paymentId,
          reason: values.reason,
        });
      form.reset();
      onOpenChange(false);
      toast.add({
        type: "success",
        title: type === "loan" ? "Préstamo anulado" : "Abono anulado",
        description: "El registro dejó de afectar los saldos.",
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "No pudimos anular el registro.";
      form.setError("root.server", { message });
      toast.add({
        type: "error",
        title: "No pudimos anular el registro",
        description: message,
        priority: "high",
      });
    }
  }
  const pending = loanMutation.isPending || paymentMutation.isPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "loan" ? "Anular préstamo" : "Anular abono"}
          </DialogTitle>
          <DialogDescription>
            El registro no se borrará, pero dejará de afectar los saldos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej. lo registré por error"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root?.server?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.root.server.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Volver
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Anulando…" : "Confirmar anulación"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
