"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useSession } from "@/hooks/use-session";
import {
  useBusiness,
  usePatchProfile,
  useProfile,
  useSaveProfile,
} from "@/lib/queries/onboarding";
import {
  profileSettingsSchema,
  type ProfileSettingsValues,
} from "@/lib/validation/onboarding-schemas";
import { Button } from "@/components/ui/button";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SearchableSelect } from "@/components/searchable-select";
import { colombiaDepartments } from "@oikentra/location-catalog";

export default function ProfileSettings() {
  return (
    <AuthGuard>
      <ProfileSettingsContent />
    </AuthGuard>
  );
}

function ProfileSettingsContent() {
  const { user } = useSession();
  const { businessId } = useParams<{ businessId: string }>();
  const router = useRouter();
  const { data: business, isLoading: businessLoading, error: businessError } =
    useBusiness(businessId);
  const { data: profile, isLoading: profileLoading, error: profileError } =
    useProfile();
  const saveProfileMutation = useSaveProfile();
  const patchProfileMutation = usePatchProfile();
  const [message, setMessage] = useState("");

  const form = useForm<ProfileSettingsValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      department: "",
      city: "",
      phone: "",
    },
  });

  const department = useWatch({ control: form.control, name: "department" });
  const selectedDepartment = useMemo(
    () => colombiaDepartments.find(({ name }) => name === department),
    [department],
  );

  const fetchErrorMessage =
    businessError || profileError ? "No pudimos cargar tu perfil." : "";

  useEffect(() => {
    if (profile) {
      form.reset({
        department: profile.department ?? "",
        city: profile.city ?? "",
        phone: profile.phone ?? "",
      });
    }
  }, [profile, form]);

  async function submit(values: ProfileSettingsValues) {
    setMessage("");
    try {
      const hasExistingProfile = Boolean(profile && "userId" in profile);
      const payload = {
        department: values.department,
        city: values.city,
        phone: values.phone || null,
      };
      const updated = hasExistingProfile
        ? await patchProfileMutation.mutateAsync(payload)
        : await saveProfileMutation.mutateAsync(payload);
      form.reset({
        department: updated.department ?? "",
        city: updated.city ?? "",
        phone: updated.phone ?? "",
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

  const loading = businessLoading || profileLoading;

  if (loading || !user)
    return (
      <OikentraLoader label="Cargando tu perfil" className="min-h-[60vh]" />
    );

  if (!business)
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">{message || fetchErrorMessage || "Negocio no encontrado."}</p>
        <Button onClick={() => router.push("/dashboard")}>
          Volver a mis negocios
        </Button>
      </div>
    );

  return (
    <DashboardShell business={business} user={user}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Perfil</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Configura tu perfil
          </h1>
          <p className="mt-2 text-muted-foreground">
            Mantén tus datos de contacto actualizados.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Información personal</CardTitle>
            <CardDescription>
              Edita tu ubicación y teléfono de contacto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                className="grid gap-5"
                onSubmit={form.handleSubmit(submit)}
              >
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value ?? ""}
                          options={colombiaDepartments}
                          placeholder="Busca tu departamento"
                          onChange={(value) => {
                            field.onChange(value);
                            form.setValue("city", "");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad o municipio</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value ?? ""}
                          options={selectedDepartment?.municipalities ?? []}
                          placeholder={
                            selectedDepartment
                              ? "Busca tu ciudad o municipio"
                              : "Elige primero un departamento"
                          }
                          disabled={!selectedDepartment}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="300 000 0000"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
      </div>
    </DashboardShell>
  );
}
