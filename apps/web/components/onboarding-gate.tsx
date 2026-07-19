"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  colombiaDepartments,
  type LocationOption,
} from "@oikentra/location-catalog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  createBusiness,
  getBusinesses,
  getProfile,
  saveProfile,
  type Business,
} from "@/lib/onboarding-api";
import {
  businessOnboardingSchema,
  profileOnboardingSchema,
  type BusinessOnboardingValues,
  type ProfileOnboardingValues,
} from "@/lib/validation/onboarding-schemas";

function ErrorState({
  message,
  onRetry,
  busy,
}: {
  message: string;
  onRetry: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
        <Button onClick={onRetry} disabled={busy}>
          {busy ? "Reintentando..." : "Reintentar"}
        </Button>
      </div>
    </div>
  );
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<
    "loading" | "profile" | "business" | "ready" | "error"
  >("loading");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const profile = await getProfile();
      if (!profile.profileCompleted) {
        setStatus("profile");
        return;
      }
      const records = await getBusinesses();
      setBusinesses(records);
      setStatus("business");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos cargar tu onboarding.",
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (status === "loading")
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Preparando tu espacio...
      </div>
    );
  if (status === "error")
    return (
      <ErrorState
        message={error ?? "No pudimos cargar tu onboarding."}
        onRetry={() => void load()}
        busy={false}
      />
    );
  if (status === "profile")
    return <ProfileOnboarding onComplete={() => void load()} />;
  if (status === "business")
    return (
      <BusinessOnboarding
        businesses={businesses}
        onComplete={() => void load()}
      />
    );
  return <>{children}</>;
}

function ProfileOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ProfileOnboardingValues>({
    resolver: zodResolver(profileOnboardingSchema),
    defaultValues: { department: "", city: "", phone: "" },
    mode: "onTouched",
  });
  const labels = ["Departamento", "Ciudad", "Teléfono"];
  const fields = ["department", "city", "phone"] as const;
  const departmentValue = useWatch({
    control: form.control,
    name: "department",
  });
  const selectedDepartment = colombiaDepartments.find(
    ({ name }) => name === departmentValue,
  );

  async function next() {
    const valid = await form.trigger(fields[step]);
    if (!valid) return;
    if (step < fields.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    setError(null);
    if (!(await form.trigger())) return;
    try {
      await saveProfile({
        ...form.getValues(),
        phone: form.getValues().phone || null,
      });
      onComplete();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos guardar tu perfil.",
      );
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Paso {step + 1} de 3
          </p>
          <CardTitle>Conozcamos tu operación</CardTitle>
          <CardDescription>
            Completa estos datos para preparar tu espacio de trabajo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void next();
              }}
            >
              {step === 0 ? (
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels[step]}</FormLabel>
                      <FormControl>
                        <SearchableLocationSelect
                          value={field.value}
                          options={colombiaDepartments}
                          placeholder="Busca un departamento"
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
              ) : step === 1 ? (
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels[step]}</FormLabel>
                      <FormControl>
                        <SearchableLocationSelect
                          value={field.value}
                          options={selectedDepartment?.municipalities ?? []}
                          placeholder={
                            selectedDepartment
                              ? "Busca una ciudad o municipio"
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
              ) : (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="300 000 0000"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={step === 0}
                  onClick={() => setStep((value) => value - 1)}
                >
                  Atrás
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Guardando..."
                    : step === 3
                      ? "Guardar perfil"
                      : "Continuar"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function SearchableLocationSelect({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  value: string;
  options: LocationOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const filtered = options
    .filter(({ name }) =>
      name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .slice(0, 80);
  return (
    <div className="relative">
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls="location-options"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          onChange("");
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && !disabled ? (
        <div
          id="location-options"
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {filtered.length ? (
            filtered.map((option) => (
              <button
                key={option.code}
                type="button"
                role="option"
                aria-selected={option.name === value}
                className="block w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.name);
                  setQuery(option.name);
                  setOpen(false);
                }}
              >
                {option.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No encontramos coincidencias.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BusinessOnboarding({
  businesses,
  onComplete,
}: {
  businesses: Business[];
  onComplete: () => void;
}) {
  const form = useForm<BusinessOnboardingValues>({
    resolver: zodResolver(businessOnboardingSchema),
    defaultValues: { name: "" },
  });
  const [error, setError] = useState<string | null>(null);
  async function submit(values: BusinessOnboardingValues) {
    try {
      const business = await createBusiness(values);
      localStorage.setItem("oikentra.activeBusinessId", business.id);
      onComplete();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No pudimos crear el negocio.",
      );
    }
  }
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            {businesses.length
              ? "Elige tu negocio"
              : "Ahora crea tu primer negocio"}
          </CardTitle>
          <CardDescription>
            {businesses.length
              ? "Selecciona el espacio que quieres abrir."
              : "Este será el espacio donde registrarás tus ventas, gastos y clientes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
              {businesses.length ? (
                <div className="space-y-2">
                  {businesses.map((business) => (
                    <Button
                      key={business.id}
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        localStorage.setItem(
                          "oikentra.activeBusinessId",
                          business.id,
                        );
                        onComplete();
                      }}
                    >
                      {business.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del negocio</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Tienda El Progreso"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              {!businesses.length ? (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Creando..." : "Crear negocio"}
                </Button>
              ) : null}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
