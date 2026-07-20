"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Call02Icon,
  CheckmarkCircle02Icon,
  City01Icon,
  Location01Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { OikentraLoader } from "@/components/ui/oikentra-loader"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { saveActiveBusinessId, type Business } from "@/lib/onboarding-api"
import {
  useBusinesses,
  useCreateBusiness,
  useProfile,
  useSaveProfile,
} from "@/lib/queries/onboarding"
import {
  businessOnboardingSchema,
  profileOnboardingSchema,
} from "@/lib/validation/onboarding-schemas"
import { colombiaDepartments } from "@oikentra/location-catalog"
import { SearchableSelect } from "./searchable-select"

const onboardingFlowSchema = profileOnboardingSchema
  .extend({
    businessName: businessOnboardingSchema.shape.name,
  })
  .refine(
    (values) => {
      if (!values.phone) return true
      const digits = values.phone.replace(/\D/g, "")
      return digits.length >= 7 && digits.length <= 10
    },
    {
      message: "Ingresa un teléfono válido (7 a 10 dígitos).",
      path: ["phone"],
    },
  )
  .refine((values) => values.businessName.trim().length >= 2, {
    message: "El nombre debe tener al menos 2 caracteres.",
    path: ["businessName"],
  })

type OnboardingFlowValues = z.infer<typeof onboardingFlowSchema>

type StepId = keyof OnboardingFlowValues

const steps = [
  {
    id: "department" as const,
    icon: Location01Icon,
    eyebrow: "Ubicación",
    title: "¿En qué departamento operas?",
    subtitle: "Nos ayuda a preparar impuestos y formatos locales para tu negocio.",
  },
  {
    id: "city" as const,
    icon: City01Icon,
    eyebrow: "Ubicación",
    title: "¿Cuál es tu ciudad o municipio?",
    subtitle: "Elige el lugar donde atiendes a tus clientes.",
  },
  {
    id: "phone" as const,
    icon: Call02Icon,
    eyebrow: "Contacto",
    title: "¿A qué número te contactamos?",
    subtitle: "Opcional. Lo usamos para recuperar tu cuenta y avisos importantes.",
  },
  {
    id: "businessName" as const,
    icon: Store01Icon,
    eyebrow: "Tu negocio",
    title: "Ponle nombre a tu negocio",
    subtitle: "Este será el espacio donde registrarás ventas, gastos, clientes y fiados.",
  },
] satisfies { id: StepId; icon: typeof Location01Icon; eyebrow: string; title: string; subtitle: string }[]

const emptyFlowValues: OnboardingFlowValues = {
  department: "",
  city: "",
  phone: "",
  businessName: "",
}

type OnboardingGateProps = { children: React.ReactNode }

export function OnboardingGate({ children }: OnboardingGateProps) {
  const [completed, setCompleted] = useState(false)
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile()
  const profileCompleted = Boolean(profile?.profileCompleted)
  const {
    data: businesses,
    isLoading: businessesLoading,
    error: businessesError,
    refetch: refetchBusinesses,
  } = useBusinesses({ enabled: profileCompleted })

  if (completed) {
    return <>{children}</>
  }

  if (profileLoading) {
    return (
      <GateMessage>
        <OikentraLoader label="Preparando tu espacio" />
      </GateMessage>
    )
  }

  if (profileError) {
    return (
      <GateMessage>
        <p role="alert">{profileError.message}</p>
        <Button type="button" onClick={() => void refetchProfile()}>
          Reintentar
        </Button>
      </GateMessage>
    )
  }

  if (!profileCompleted) {
    return (
      <OnboardingFrame>
        <OnboardingFlow onComplete={() => setCompleted(true)} />
      </OnboardingFrame>
    )
  }

  if (businessesLoading) {
    return (
      <GateMessage>
        <OikentraLoader label="Preparando tu espacio" />
      </GateMessage>
    )
  }

  if (businessesError) {
    return (
      <GateMessage>
        <p role="alert">{businessesError.message}</p>
        <Button type="button" onClick={() => void refetchBusinesses()}>
          Reintentar
        </Button>
      </GateMessage>
    )
  }

  return (
    <OnboardingFrame>
      <BusinessOnboarding businesses={businesses ?? []} />
    </OnboardingFrame>
  )
}

function GateMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full min-w-0 flex-col items-center justify-center gap-4 overflow-x-hidden break-words px-4 py-6 text-center text-muted-foreground sm:px-6">
      {children}
    </div>
  )
}

function OnboardingFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh w-full min-w-0 items-start justify-center overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12 md:items-center md:px-8 md:py-16">
      <div className="w-full min-w-0 max-w-lg">{children}</div>
    </main>
  )
}

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const saveProfileMutation = useSaveProfile()
  const createBusinessMutation = useCreateBusiness()

  const form = useForm<OnboardingFlowValues>({
    resolver: zodResolver(onboardingFlowSchema),
    defaultValues: emptyFlowValues,
    mode: "onChange",
  })

  const current = steps[step]
  const currentId: StepId = current.id
  const isLast = step === steps.length - 1

  const department = useWatch({ control: form.control, name: "department" })
  const selectedDepartment = useMemo(
    () => colombiaDepartments.find(({ name }) => name === department),
    [department],
  )

  const values = form.getValues()

  async function onSubmit(data: OnboardingFlowValues) {
    setSubmitError(null)
    try {
      await saveProfileMutation.mutateAsync({
        department: data.department,
        city: data.city,
        phone: data.phone || null,
      })
      const business = await createBusinessMutation.mutateAsync({
        name: data.businessName.trim(),
      })
      saveActiveBusinessId(business.id)
      router.push(`/dashboard/${business.id}`)
      setDone(true)
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "No pudimos guardar tu información. Inténtalo de nuevo.",
      )
    }
  }

  async function goNext() {
    setSubmitError(null)
    if (isLast) {
      await form.handleSubmit(onSubmit)()
      return
    }
    const valid = await form.trigger(currentId)
    if (valid) {
      setStep((value) => value + 1)
    }
  }

  function goBack() {
    setSubmitError(null)
    setStep((value) => Math.max(value - 1, 0))
  }

  function skipPhone() {
    form.setValue("phone", "")
    setSubmitError(null)
    setStep((value) => value + 1)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={34} strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-6 break-words text-3xl font-bold tracking-tight text-balance">
          ¡Todo listo, {values.businessName}!
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
          Tu espacio en {values.city} quedó configurado. Ya puedes registrar tu primera venta y
          llevar el control de tus fiados.
        </p>
        <Button
          size="lg"
          className="mt-8 h-12 rounded-xl px-6 text-sm font-semibold"
          onClick={onComplete}
        >
          Entrar a mi negocio
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} aria-hidden="true" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div
        className="flex items-center gap-1.5"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
      >
        {steps.map((item, index) => (
          <span
            key={item.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {current.eyebrow} · Paso {step + 1} de {steps.length}
      </p>

      <div className="mt-3 flex items-start gap-3">
        <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={current.icon} size={22} strokeWidth={1.9} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight text-balance">
            {current.title}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">
            {current.subtitle}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          className="mt-7"
          onSubmit={(event) => {
            event.preventDefault()
            void goNext()
          }}
        >
          <div key={current.id} className="min-w-0">
            <FormField
              control={form.control}
              name={currentId}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">{current.title}</FormLabel>
                  <FormControl>
                    {current.id === "department" ? (
                      <SearchableSelect
                        value={field.value ?? ""}
                        options={colombiaDepartments}
                        placeholder="Busca tu departamento"
                        onChange={(value) => {
                          field.onChange(value)
                          form.setValue("city", "")
                        }}
                      />
                    ) : current.id === "city" ? (
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
                    ) : current.id === "phone" ? (
                      <div className="group relative">
                        <HugeiconsIcon
                          icon={Call02Icon}
                          size={19}
                          strokeWidth={1.8}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                          aria-hidden="true"
                        />
                        <Input
                          aria-label="Teléfono"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          autoFocus
                          placeholder="300 000 0000"
                          className="h-12 w-full rounded-xl border-border bg-card pl-11 pr-4 text-sm shadow-sm placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
                          {...field}
                        />
                      </div>
                    ) : (
                      <div className="group relative">
                        <HugeiconsIcon
                          icon={Store01Icon}
                          size={19}
                          strokeWidth={1.8}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                          aria-hidden="true"
                        />
                        <Input
                          aria-label="Nombre del negocio"
                          type="text"
                          autoFocus
                          placeholder="Tienda Doña Rosa"
                          className="h-12 w-full rounded-xl border-border bg-card pl-11 pr-4 text-sm shadow-sm placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
                          {...field}
                        />
                      </div>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {submitError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="mt-8 flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-12 shrink-0 rounded-xl px-3 text-sm font-medium sm:px-4"
              disabled={step === 0 || form.formState.isSubmitting}
              onClick={goBack}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} aria-hidden="true" />
              Atrás
            </Button>

            <Button
              type="submit"
              size="lg"
              className="h-12 min-w-0 flex-1 rounded-xl text-sm font-semibold"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Guardando..." : isLast ? "Crear mi negocio" : "Continuar"}
              {!form.formState.isSubmitting ? (
                <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} aria-hidden="true" />
              ) : null}
            </Button>
          </div>

          {current.id === "phone" ? (
            <button
              type="button"
              onClick={skipPhone}
              className="mx-auto mt-4 block text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Prefiero agregarlo después
            </button>
          ) : null}
        </form>
      </Form>
    </div>
  )
}

const businessFormSchema = businessOnboardingSchema.refine(
  (values) => values.name.trim().length >= 2,
  {
    message: "El nombre debe tener al menos 2 caracteres.",
    path: ["name"],
  },
)

type BusinessFormValues = z.infer<typeof businessFormSchema>

function BusinessOnboarding({
  businesses,
}: {
  businesses: Business[]
}) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createBusinessMutation = useCreateBusiness()

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  })

  async function onSubmit(data: BusinessFormValues) {
    setSubmitError(null)
    try {
      const business = await createBusinessMutation.mutateAsync({
        name: data.name.trim(),
      })
      saveActiveBusinessId(business.id)
      router.push(`/dashboard/${business.id}`)
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "No pudimos crear el negocio.",
      )
    }
  }

  async function selectBusiness(id: string) {
    saveActiveBusinessId(id)
    router.push(`/dashboard/${id}`)
  }

  return (
    <div className="w-full">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tu negocio</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-balance">
        {businesses.length ? "Elige tu negocio" : "Crea tu primer negocio"}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">
        {businesses.length
          ? "Selecciona el espacio que quieres abrir."
          : "Aquí registrarás tus ventas, gastos y clientes."}
      </p>
      {businesses.length ? (
        <div className="mt-7 grid gap-3">
          {businesses.map((business) => (
            <Button
              key={business.id}
              type="button"
              variant="outline"
              className="h-auto min-w-0 justify-start rounded-xl px-3 py-4 text-left whitespace-normal sm:px-4"
              onClick={() => void selectBusiness(business.id)}
            >
              <HugeiconsIcon icon={Store01Icon} size={19} strokeWidth={1.8} aria-hidden="true" />
              <span className="min-w-0 break-words">{business.name}</span>
            </Button>
          ))}
        </div>
      ) : (
        <Form {...form}>
          <form className="mt-7" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Nombre del negocio</FormLabel>
                  <FormControl>
                    <div className="group relative">
                      <HugeiconsIcon
                        icon={Store01Icon}
                        size={19}
                        strokeWidth={1.8}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        aria-label="Nombre del negocio"
                        type="text"
                        autoFocus
                        placeholder="Tienda Doña Rosa"
                        className="h-12 w-full rounded-xl border-border bg-card pl-11 pr-4 text-sm shadow-sm placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {submitError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="mt-8 h-12 w-full rounded-xl text-sm font-semibold"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Creando..." : "Crear mi negocio"}
              {!form.formState.isSubmitting ? (
                <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} aria-hidden="true" />
              ) : null}
            </Button>
          </form>
        </Form>
      )}
    </div>
  )
}
