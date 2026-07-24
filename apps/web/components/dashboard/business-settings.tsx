"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useSession } from "@/hooks/use-session";
import { useBusiness, useUpdateBusiness } from "@/lib/queries/onboarding";
import {
  businessSettingsSchema,
  type BusinessSettingsValues,
} from "@/lib/validation/onboarding-schemas";
import { Button } from "@/components/ui/button";
import { CollaboratorsSettings } from "@/components/dashboard/collaborators-settings";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function BusinessSettings() {
  return (
    <AuthGuard>
      <BusinessSettingsContent />
    </AuthGuard>
  );
}

function BusinessSettingsContent() {
  const { user } = useSession();
  const { businessId } = useParams<{ businessId: string }>();
  const router = useRouter();
  const { data: business, isLoading, error } = useBusiness(businessId);
  const updateBusinessMutation = useUpdateBusiness();
  const [message, setMessage] = useState("");
  const form = useForm<BusinessSettingsValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      name: "",
      businessType: "OTHER",
      currencyCode: "COP",
      timezone: "America/Bogota",
    },
  });

  const fetchErrorMessage = error ? "No pudimos cargar este negocio." : "";

  useEffect(() => {
    if (business) {
      form.reset({
        name: business.name,
        businessType:
          (business.businessType as BusinessSettingsValues["businessType"]) ||
          "OTHER",
        currencyCode: business.currencyCode || "COP",
        timezone: business.timezone || "America/Bogota",
      });
    }
  }, [business, form]);

  async function submit(values: BusinessSettingsValues) {
    setMessage("");
    try {
      const updated = await updateBusinessMutation.mutateAsync({
        id: businessId,
        input: values,
      });
      form.reset({
        name: updated.name,
        businessType:
          (updated.businessType as BusinessSettingsValues["businessType"]) ||
          "OTHER",
        currencyCode: updated.currencyCode || "COP",
        timezone: updated.timezone || "America/Bogota",
      });
      setMessage("Cambios guardados");
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "No pudimos guardar los cambios.",
      );
    }
  }
  if (isLoading)
    return <OikentraLoader label="Cargando configuración" className="min-h-[60vh]" />;
  if (!business || !user)
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">{message || fetchErrorMessage}</p>
        <Button onClick={() => router.push("/dashboard")}>
          Volver a mis negocios
        </Button>
      </div>
    );
  return (
    <DashboardShell business={business} user={user}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium ">Configuración</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Configura tu negocio
          </h1>
          <p className="mt-2 text-muted-foreground">
            Estos datos ayudan a que Oikentra se adapte a tu forma de trabajar.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Información general</CardTitle>
            <CardDescription>
              Actualiza los datos básicos del espacio actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="grid gap-5" onSubmit={form.handleSubmit(submit)}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del negocio</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de negocio</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Tipo de negocio" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STORE">Tienda</SelectItem>
                            <SelectItem value="RESTAURANT">Restaurante</SelectItem>
                            <SelectItem value="OTHER">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="currencyCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={3}
                            onChange={(event) =>
                              field.onChange(event.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zona horaria</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {message ? (
                  <p
                    className={
                      message === "Cambios guardados"
                        ? "text-sm text-primary"
                        : "text-sm text-destructive"
                    }
                    role="status"
                  >
                    {message}
                  </p>
                ) : null}
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Guardando..."
                    : "Guardar cambios"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <CollaboratorsSettings businessId={businessId} />
      </div>
    </DashboardShell>
  );
}
