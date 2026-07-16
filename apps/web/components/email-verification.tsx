"use client"

import { startTransition, useEffect, useState } from "react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  Loading03Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type VerificationState = "loading" | "ready" | "submitting" | "success" | "error"

export function EmailVerification() {
  const [token, setToken] = useState<string | null>(null)
  const [state, setState] = useState<VerificationState>("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const verificationToken = fragment.get("token")

    window.history.replaceState(null, "", window.location.pathname)

    if (!verificationToken) {
      startTransition(() => {
        setMessage("Este enlace no contiene la información necesaria para confirmar tu correo.")
        setState("error")
      })
      return
    }

    startTransition(() => {
      setToken(verificationToken)
      setState("ready")
    })
  }, [])

  async function confirmEmail() {
    if (!token || state === "submitting") return

    setState("submitting")
    setMessage("")

    try {
      const response = await fetch("/api/verificar-correo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "Se hicieron demasiados intentos. Espera unos minutos y vuelve a intentarlo."
            : "El enlace no es válido o ya venció. Solicita uno nuevo desde Oikentra.",
        )
        setState("error")
        return
      }

      setToken(null)
      setState("success")
    } catch {
      setMessage("No pudimos conectar con Oikentra. Revisa tu conexión e intenta nuevamente.")
      setState("error")
    }
  }

  const isSuccess = state === "success"
  const isError = state === "error"
  const isBusy = state === "loading" || state === "submitting"

  const statusIcon = isSuccess
    ? CheckmarkCircle02Icon
    : isError
      ? Alert02Icon
      : isBusy
        ? Loading03Icon
        : Mail01Icon

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-background px-5 py-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 size-[26rem] rounded-full bg-accent/60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5 text-foreground">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <HugeiconsIcon icon={Store01Icon} size={20} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-xl font-semibold tracking-tight">Oikentra</span>
        </div>

        <Card className="gap-0 overflow-hidden rounded-3xl border-border/60 bg-card/95 py-0 shadow-xl shadow-primary/5 backdrop-blur">
          <CardHeader className="items-center gap-4 px-7 pt-9 pb-5 text-center">
            <span
              className={`grid size-16 place-items-center rounded-2xl ${
                isSuccess
                  ? "bg-primary/10 text-primary"
                  : isError
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
              }`}
              aria-hidden="true"
            >
              <HugeiconsIcon
                icon={statusIcon}
                size={30}
                strokeWidth={1.8}
                className={isBusy ? "animate-spin" : undefined}
              />
            </span>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight text-balance">
                {isSuccess
                  ? "Correo confirmado"
                  : isError
                    ? "No pudimos confirmar tu correo"
                    : "Confirma tu correo"}
              </CardTitle>
              <CardDescription className="text-pretty text-base leading-6">
                {isSuccess
                  ? "Tu cuenta está lista. Vuelve a Oikentra e inicia sesión para continuar."
                  : isError
                    ? message
                    : "Confirma que esta dirección de correo te pertenece para terminar de crear tu cuenta."}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-7 pb-8">
            {isSuccess ? (
              <a
                href="oikentra://auth/verify?verified=1"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Abrir Oikentra
              </a>
            ) : (
              <Button
                size="lg"
                className="h-12 w-full rounded-xl text-sm font-semibold"
                onClick={confirmEmail}
                disabled={!token || state === "loading" || state === "submitting"}
              >
                {state === "submitting" ? "Confirmando..." : "Confirmar correo"}
              </Button>
            )}

            <p
              className="mt-5 text-center text-xs leading-5 text-muted-foreground"
              aria-live="polite"
            >
              {isSuccess
                ? "Ya puedes cerrar esta página."
                : "El enlace es personal y vence por seguridad."}
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Necesitas ayuda?{" "}
          <a href="mailto:soporte@oikentra.com" className="font-medium text-foreground underline-offset-4 hover:underline">
            soporte@oikentra.com
          </a>
        </p>
      </div>
    </main>
  )
}
