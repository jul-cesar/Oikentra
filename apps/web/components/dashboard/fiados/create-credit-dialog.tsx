"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateCredit, useCreateCustomer } from "@/lib/queries/fiados";
import { createCreditFormSchema, type CreateCreditFormValues } from "@/lib/validation/fiados-schemas";
import type { Customer } from "@/lib/fiados-api";

const NEW_CUSTOMER = "__new__";
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export function CreateCreditDialog({ businessId, customers, open, onOpenChange, initialCustomer }: { businessId: string; customers: Customer[]; open: boolean; onOpenChange: (open: boolean) => void; initialCustomer?: Customer | null }) {
  const createCustomer = useCreateCustomer(businessId);
  const createCredit = useCreateCredit(businessId);
  const form = useForm<CreateCreditFormValues>({
    resolver: zodResolver(createCreditFormSchema),
    defaultValues: { customerId: initialCustomer?.id ?? "", newCustomerName: "", newCustomerPhone: "", newCustomerNotes: "", amount: "", creditDate: today(), note: "" },
  });
  const customerId = useWatch({ control: form.control, name: "customerId" });
  const amount = Number(useWatch({ control: form.control, name: "amount" }));
  const creatingCustomer = customerId === NEW_CUSTOMER;

  async function onSubmit(values: CreateCreditFormValues) {
    try {
      let selectedCustomerId = values.customerId;
      if (creatingCustomer) {
        const customer = await createCustomer.mutateAsync({
          name: values.newCustomerName.trim(),
          ...(values.newCustomerPhone.trim() ? { phone: values.newCustomerPhone.trim() } : {}),
          ...(values.newCustomerNotes.trim() ? { notes: values.newCustomerNotes.trim() } : {}),
        });
        selectedCustomerId = customer.id;
      }
      await createCredit.mutateAsync({ customerId: selectedCustomerId, originalAmount: Number(values.amount), creditDate: values.creditDate, ...(values.note ? { description: values.note } : {}) });
      form.reset();
      onOpenChange(false);
    } catch (cause) {
      form.setError("root.server", { message: cause instanceof Error ? cause.message : "No pudimos guardar el fiado." });
    }
  }

  const pending = createCustomer.isPending || createCredit.isPending;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>Nuevo fiado</DialogTitle><DialogDescription>Registra lo que un cliente se llevó y aún no ha pagado.</DialogDescription></DialogHeader>
    <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField control={form.control} name="customerId" render={({ field }) => <FormItem><FormLabel>Cliente</FormLabel><FormControl><Select value={field.value} onValueChange={field.onChange}><SelectTrigger autoFocus><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger><SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}<SelectItem value={NEW_CUSTOMER}>+ Crear cliente nuevo</SelectItem></SelectContent></Select></FormControl><FormMessage /></FormItem>} />
      {creatingCustomer ? <div className="space-y-3 rounded-lg border bg-muted/20 p-3"><p className="text-sm font-medium">Datos del nuevo cliente</p><FormField control={form.control} name="newCustomerName" render={({ field }) => <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} placeholder="Ej. Ana Pérez" /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="newCustomerPhone" render={({ field }) => <FormItem><FormLabel>Teléfono (opcional)</FormLabel><FormControl><Input {...field} inputMode="tel" placeholder="300 123 4567" /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="newCustomerNotes" render={({ field }) => <FormItem><FormLabel>Notas (opcional)</FormLabel><FormControl><Input {...field} placeholder="Cliente frecuente" /></FormControl><FormMessage /></FormItem>} /></div> : null}
      <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="amount" render={({ field }) => <FormItem><FormLabel>Monto</FormLabel><FormControl><Input {...field} type="number" min="1" step="1" inputMode="numeric" placeholder="0" /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="creditDate" render={({ field }) => <FormItem><FormLabel>Fecha</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} /></div>
      <FormField control={form.control} name="note" render={({ field }) => <FormItem><FormLabel>Nota del fiado (opcional)</FormLabel><FormControl><Input {...field} placeholder="Ej. mercado de la semana" /></FormControl><FormMessage /></FormItem>} />
      <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">Este fiado queda por cobrar. <strong className="text-foreground">No entra a caja hasta que pague.</strong>{amount > 0 ? ` ${money(amount)}.` : ""}</div>
      {form.formState.errors.root?.server?.message ? <p className="text-sm text-destructive" role="alert">{form.formState.errors.root.server.message}</p> : null}
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar fiado"}</Button></DialogFooter>
    </form></Form>
  </DialogContent></Dialog>;
}
