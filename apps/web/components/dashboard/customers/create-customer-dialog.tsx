"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateCustomer, useUpdateCustomer } from "@/lib/queries/fiados";
import { createCustomerFormSchema, type CreateCustomerFormValues } from "@/lib/validation/customer-schemas";
import type { Customer } from "@/lib/fiados-api";

export function CreateCustomerDialog({ businessId, customer, open, onOpenChange }: { businessId: string; customer?: Customer | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateCustomer(businessId);
  const update = useUpdateCustomer(businessId);
  const editing = Boolean(customer);
  const form = useForm<CreateCustomerFormValues>({
    resolver: zodResolver(createCustomerFormSchema),
    defaultValues: { name: customer?.name ?? "", phone: customer?.phone ?? "", notes: customer?.notes ?? "" },
  });

  useEffect(() => {
    if (open) form.reset({ name: customer?.name ?? "", phone: customer?.phone ?? "", notes: customer?.notes ?? "" });
  }, [customer, form, open]);

  async function onSubmit(values: CreateCustomerFormValues) {
    try {
      if (customer) {
        await update.mutateAsync({
          customerId: customer.id,
          input: { name: values.name.trim(), phone: values.phone.trim() || null, notes: values.notes.trim() || null },
        });
      } else {
        await create.mutateAsync({
          name: values.name.trim(),
          ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
          ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
        });
      }
      form.reset();
      onOpenChange(false);
    } catch (cause) {
      form.setError("root.server", { message: cause instanceof Error ? cause.message : `No pudimos ${editing ? "actualizar" : "crear"} el cliente.` });
    }
  }

  const pending = create.isPending || update.isPending;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle><DialogDescription>{editing ? "Actualiza los datos de contacto y las notas del cliente." : "Guarda los datos del cliente para usarlo después en sus fiados."}</DialogDescription></DialogHeader>
      <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} autoFocus placeholder="Ej. Ana Pérez" /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>Teléfono (opcional)</FormLabel><FormControl><Input {...field} inputMode="tel" placeholder="300 123 4567" /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="notes" render={({ field }) => <FormItem><FormLabel>Notas (opcional)</FormLabel><FormControl><Input {...field} placeholder="Cliente frecuente" /></FormControl><FormMessage /></FormItem>} />
        {form.formState.errors.root?.server?.message ? <p className="text-sm text-destructive" role="alert">{form.formState.errors.root.server.message}</p> : null}
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear cliente"}</Button></DialogFooter>
      </form></Form>
    </DialogContent>
  </Dialog>;
}
