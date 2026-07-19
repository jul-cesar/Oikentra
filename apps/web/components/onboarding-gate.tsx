"use client"

import { useEffect, useMemo, useState } from "react"
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
import { createBusiness, getBusinesses, getProfile, saveActiveBusinessId, saveProfile, type Business } from "@/lib/onboarding-api"
import { colombiaDepartments } from "@oikentra/location-catalog"
import { SearchableSelect } from "./searchable-select"

type Answers = {
  department: string
  city: string
  phone: string
  businessName: string
}

const emptyAnswers: Answers = {
  department: "",
  city: "",
  phone: "",
  businessName: "",
}

const steps = [
  {
    id: "department",
    icon: Location01Icon,
    eyebrow: "Ubicación",
    title: "¿En qué departamento operas?",
    subtitle: "Nos ayuda a preparar impuestos y formatos locales para tu negocio.",
  },
  {
    id: "city",
    icon: City01Icon,
    eyebrow: "Ubicación",
    title: "¿Cuál es tu ciudad o municipio?",
    subtitle: "Elige el lugar donde atiendes a tus clientes.",
  },
  {
    id: "phone",
    icon: Call02Icon,
    eyebrow: "Contacto",
    title: "¿A qué número te contactamos?",
    subtitle: "Opcional. Lo usamos para recuperar tu cuenta y avisos importantes.",
  },
  {
    id: "businessName",
    icon: Store01Icon,
    eyebrow: "Tu negocio",
    title: "Ponle nombre a tu negocio",
    subtitle: "Este será el espacio donde registrarás ventas, gastos, clientes y fiados.",
  },
] as const

type OnboardingGateProps = { children: React.ReactNode }

type GateStatus = "loading" | "profile" | "business" | "ready" | "error"

export function OnboardingGate({ children }: OnboardingGateProps) {
  const [status, setStatus] = useState<GateStatus>("loading")
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setStatus("loading")
    setError(null)
    try {
      const profile = await getProfile()
      if (!profile.profileCompleted) {
        setStatus("profile")
        return
      }
      setBusinesses(await getBusinesses())
      setStatus("business")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar tu onboarding.")
      setStatus("error")
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [])

  if (status === "loading") {
    return <GateMessage>Preparando tu espacio...</GateMessage>
  }
  if (status === "error") {
    return (
      <GateMessage>
        <p role="alert">{error}</p>
        <Button type="button" onClick={() => void load()}>Reintentar</Button>
      </GateMessage>
    )
  }
  if (status === "profile") {
    return (
      <OnboardingFrame>
        <OnboardingFlow onComplete={() => setStatus("ready")} />
      </OnboardingFrame>
    )
  }
  if (status === "business") {
    return (
      <OnboardingFrame>
        <BusinessOnboarding businesses={businesses} onComplete={() => setStatus("ready")} />
      </OnboardingFrame>
    )
  }
  return <>{children}</>
}

function GateMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh w-full min-w-0 flex-col items-center justify-center gap-4 overflow-x-hidden break-words px-4 py-6 text-center text-muted-foreground sm:px-6">{children}</div>
}

function OnboardingFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh w-full min-w-0 items-start justify-center overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12 md:items-center md:px-8 md:py-16">
      <div className="w-full min-w-0 max-w-lg">{children}</div>
    </main>
  )
}

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [answers, setAnswers] = useState<Answers>(emptyAnswers)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const current = steps[step]
  const isLast = step === steps.length - 1

  const selectedDepartment = useMemo(
    () => colombiaDepartments.find(({ name }) => name === answers.department),
    [answers.department],
  )

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  function validate(): string | null {
    switch (current.id) {
      case "department":
        return answers.department ? null : "Elige tu departamento para continuar."
      case "city":
        return answers.city ? null : "Elige tu ciudad o municipio."
      case "phone": {
        if (!answers.phone) return null
        const digits = answers.phone.replace(/\D/g, "")
        return digits.length >= 7 && digits.length <= 10 ? null : "Ingresa un teléfono válido (7 a 10 dígitos)."
      }
      case "businessName":
        return answers.businessName.trim().length >= 2 ? null : "El nombre debe tener al menos 2 caracteres."
      default:
        return null
    }
  }

  async function goNext() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    if (!isLast) {
      setStep((value) => value + 1)
      return
    }
    setSubmitting(true)
    try {
      await saveProfile({
        department: answers.department,
        city: answers.city,
        phone: answers.phone || null,
      })
      const business = await createBusiness({ name: answers.businessName.trim() })
      saveActiveBusinessId(business.id)
      setDone(true)
    } catch {
      setError("No pudimos guardar tu información. Inténtalo de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  function goBack() {
    setError(null)
    setStep((value) => Math.max(value - 1, 0))
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={34} strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-6 break-words text-3xl font-bold tracking-tight text-balance">¡Todo listo, {answers.businessName}!</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
          Tu espacio en {answers.city} quedó configurado. Ya puedes registrar tu primera venta y llevar el control de
          tus fiados.
        </p>
          <Button size="lg" className="mt-8 h-12 rounded-xl px-6 text-sm font-semibold" onClick={onComplete}>
            Entrar a mi negocio
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} aria-hidden="true" />
          </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Progreso por segmentos */}
      <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
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
          <h1 className="break-words text-2xl font-bold tracking-tight text-balance">{current.title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">{current.subtitle}</p>
        </div>
      </div>

      <form
        className="mt-7"
        onSubmit={(event) => {
          event.preventDefault()
          void goNext()
        }}
      >
        {/* key por paso: fuerza remonte y evita arrastrar el texto de una pregunta a otra */}
        <div key={current.id} className="min-w-0">
          {current.id === "department" ? (
            <SearchableSelect
              value={answers.department}
              options={colombiaDepartments}
              placeholder="Busca tu departamento"
              onChange={(value) => {
                update("department", value)
                // Reinicia la ciudad al cambiar de departamento.
                setAnswers((prev) => ({ ...prev, department: value, city: "" }))
              }}
            />
          ) : null}

          {current.id === "city" ? (
            <SearchableSelect
              value={answers.city}
              options={selectedDepartment?.municipalities ?? []}
              placeholder={selectedDepartment ? "Busca tu ciudad o municipio" : "Elige primero un departamento"}
              disabled={!selectedDepartment}
              onChange={(value) => update("city", value)}
            />
          ) : null}

          {current.id === "phone" ? (
            <div className="group relative">
              <HugeiconsIcon
                icon={Call02Icon}
                size={19}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                aria-hidden="true"
              />
              <input
                aria-label="Teléfono"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                value={answers.phone}
                placeholder="300 000 0000"
                onChange={(event) => update("phone", event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
            </div>
          ) : null}

          {current.id === "businessName" ? (
            <div className="group relative">
              <HugeiconsIcon
                icon={Store01Icon}
                size={19}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                aria-hidden="true"
              />
              <input
                aria-label="Nombre del negocio"
                type="text"
                autoFocus
                value={answers.businessName}
                placeholder="Tienda Doña Rosa"
                onChange={(event) => update("businessName", event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 shrink-0 rounded-xl px-3 text-sm font-medium sm:px-4"
            disabled={step === 0 || submitting}
            onClick={goBack}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} aria-hidden="true" />
            Atrás
          </Button>

          <Button type="submit" size="lg" className="h-12 min-w-0 flex-1 rounded-xl text-sm font-semibold" disabled={submitting}>
            {submitting ? "Guardando..." : isLast ? "Crear mi negocio" : "Continuar"}
            {!submitting ? (
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} aria-hidden="true" />
            ) : null}
          </Button>
        </div>

        {current.id === "phone" ? (
          <button
            type="button"
            onClick={() => {
              update("phone", "")
              setStep((value) => value + 1)
            }}
            className="mx-auto mt-4 block text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Prefiero agregarlo después
          </button>
        ) : null}
      </form>
    </div>
  )
}

function BusinessOnboarding({ businesses, onComplete }: { businesses: Business[]; onComplete: () => void }) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function selectBusiness(id: string) {
    saveActiveBusinessId(id)
    onComplete()
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const business = await createBusiness({ name: trimmedName })
      saveActiveBusinessId(business.id)
      onComplete()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos crear el negocio.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tu negocio</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-balance">
        {businesses.length ? "Elige tu negocio" : "Crea tu primer negocio"}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">
        {businesses.length ? "Selecciona el espacio que quieres abrir." : "Aquí registrarás tus ventas, gastos y clientes."}
      </p>
      {businesses.length ? (
        <div className="mt-7 grid gap-3">
          {businesses.map((business) => (
            <Button key={business.id} type="button" variant="outline" className="h-auto min-w-0 justify-start rounded-xl px-3 py-4 text-left whitespace-normal sm:px-4" onClick={() => void selectBusiness(business.id)}>
              <HugeiconsIcon icon={Store01Icon} size={19} strokeWidth={1.8} aria-hidden="true" />
              <span className="min-w-0 break-words">{business.name}</span>
            </Button>
          ))}
        </div>
      ) : (
        <form className="mt-7" onSubmit={(event) => void submit(event)}>
          <div className="group relative">
            <HugeiconsIcon icon={Store01Icon} size={19} strokeWidth={1.8} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input aria-label="Nombre del negocio" type="text" autoFocus value={name} placeholder="Tienda Doña Rosa" onChange={(event) => { setName(event.target.value); setError(null) }} className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </div>
          {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
          <Button type="submit" size="lg" className="mt-8 h-12 w-full rounded-xl text-sm font-semibold" disabled={submitting}>
            {submitting ? "Creando..." : "Crear mi negocio"}
            {!submitting ? <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} aria-hidden="true" /> : null}
          </Button>
        </form>
      )}
    </div>
  )
}
