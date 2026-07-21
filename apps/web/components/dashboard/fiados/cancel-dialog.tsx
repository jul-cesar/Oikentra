"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCancelCredit, useCancelPayment } from "@/lib/queries/fiados";
import { cancelFormSchema, type CancelFormValues } from "@/lib/validation/fiados-schemas";

export function CancelDialog({ businessId, type, creditId, paymentId, open, onOpenChange }: { businessId: string; type: "credit" | "payment"; creditId: string; paymentId?: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const creditMutation = useCancelCredit(businessId); const paymentMutation = useCancelPayment(businessId);
  const form = useForm<CancelFormValues>({ resolver: zodResolver(cancelFormSchema), defaultValues: { reason: "" } });
  async function onSubmit(values: CancelFormValues) { try { if (type === "credit") await creditMutation.mutateAsync({ creditId, reason: values.reason }); else if (paymentId) await paymentMutation.mutateAsync({ creditId, paymentId, reason: values.reason }); form.reset(); onOpenChange(false); } catch (cause) { form.setError("root.server", { message: cause instanceof Error ? cause.message : "No pudimos anular el registro." }); } }
  const pending = creditMutation.isPending || paymentMutation.isPending;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{type === "credit" ? "Anular fiado" : "Anular abono"}</DialogTitle><DialogDescription>El registro no se borrará, pero dejará de afectar los saldos.</DialogDescription></DialogHeader><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"><FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Motivo</FormLabel><FormControl><Input {...field} placeholder="Ej. lo registré por error" autoFocus /></FormControl><FormMessage /></FormItem>} />{form.formState.errors.root?.server?.message ? <p className="text-sm text-destructive" role="alert">{form.formState.errors.root.server.message}</p> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Volver</Button><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Anulando…" : "Confirmar anulación"}</Button></DialogFooter></form></Form></DialogContent></Dialog>;
}
