"use client"

import { useEffect, useRef, useState } from "react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const RESEND_COOLDOWN_SECONDS = 300

type VerificationStatus = "loading" | "pending" | "verifying" | "success" | "error"

type EmailVerificationProps = {
  token?: string | null
  email?: string | null
  sent?: boolean
  callbackError?: string | null
  verified?: boolean
}

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function normalizeCallbackError(error: string | null | undefined): string | null {
  if (!error) return null
  return error.toLowerCase()
}

export function EmailVerification({
  token,
  email,
  sent = false,
  callbackError,
  verified = false,
}: EmailVerificationProps) {
  const normalizedError = normalizeCallbackError(callbackError)
  const isInvalidLink =
    normalizedError === "invalid_token" ||
    normalizedError === "token_expired" ||
    normalizedError === "expired_token"

  const [status, setStatus] = useState<VerificationStatus>(() => {
    if (normalizedError) return "error"
    if (verified) return "success"
    if (token) return "verifying"
    return "pending"
  })
  const [message, setMessage] = useState(() => {
    if (normalizedError) {
      return "El enlace no es válido o ya venció. Solicita uno nuevo para continuar."
    }
    if (verified) return "Tu correo quedó confirmado. Inicia sesión para continuar."
    if (token) return "Estamos comprobando tu enlace."
    return "Abre el enlace que te enviamos. Puede tardar un par de minutos en llegar."
  })
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(sent ? RESEND_COOLDOWN_SECONDS : 0)
  const resendInFlightRef = useRef(false)
  const hasVerifiedRef = useRef(false)

  useEffect(() => {
    if (!token || normalizedError || hasVerifiedRef.current) return

    hasVerifiedRef.current = true
    let cancelled = false

    async function verifyToken() {
      try {
        const { error } = await authClient.verifyEmail({
          query: { token: token as string },
        })

        if (cancelled) return

        if (error) {
          setStatus("error")
          setMessage("El enlace no es válido o ya venció. Solicita uno nuevo para continuar.")
          return
        }

        setStatus("success")
        setMessage("Tu correo quedó confirmado. Inicia sesión para continuar.")
      } catch {
        if (!cancelled) {
          setStatus("error")
          setMessage("No pudimos comprobar el enlace. Solicita uno nuevo para continuar.")
        }
      }
    }

    void verifyToken()

    return () => {
      cancelled = true
      hasVerifiedRef.current = false
    }
  }, [token, normalizedError])

  useEffect(() => {
    if (cooldown === 0) return

    const interval = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [cooldown])

  async function handleResend() {
    if (!email || cooldown > 0 || resendInFlightRef.current) return

    resendInFlightRef.current = true
    setIsResending(true)
    setStatus("pending")
    setMessage("Estamos enviando un nuevo enlace a tu correo.")

    try {
      const { error: resendError } = await authClient.sendVerificationEmail({
        email: email as string,
        callbackURL: `${window.location.origin}/verify-email?verified=1`,
      })

      if (resendError) {
        setStatus("error")
        setMessage("No pudimos reenviar el correo. Intenta nuevamente.")
        return
      }

      setCooldown(RESEND_COOLDOWN_SECONDS)
      setMessage("Te enviamos un nuevo enlace. Revisa también la carpeta de spam.")
    } catch {
      setStatus("error")
      setMessage("No pudimos reenviar el correo. Intenta nuevamente.")
    } finally {
      resendInFlightRef.current = false
      setIsResending(false)
    }
  }

  const isBusy = status === "verifying" || isResending
  const isSuccess = status === "success"
  const isError = status === "error"

  const statusIcon = isSuccess
    ? CheckmarkCircle02Icon
    : isError
      ? Alert02Icon
      : isBusy
        ? Loading03Icon
        : Mail01Icon

  const title = isSuccess
    ? "Correo confirmado"
    : isError
      ? isInvalidLink
        ? "El enlace venció"
        : "No pudimos confirmar tu correo"
      : "Confirma tu correo"

  return (
    <div className="w-full">
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
                {title}
              </CardTitle>
              {email && status !== "success" ? (
                <p className="text-center text-base font-semibold text-foreground">{email}</p>
              ) : null}
              <CardDescription className="text-pretty text-base leading-6">
                {isSuccess
                  ? message
                  : isError
                    ? message
                    : "Confirma que esta dirección de correo te pertenece para terminar de crear tu cuenta."}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-7 pb-8">
            {isSuccess ? (
              <div className="flex flex-col gap-3">
                <a
                  href="oikentra://auth/verify?verified=1"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Abrir Oikentra
                </a>
                <a
                  href="/login"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Iniciar sesión
                </a>
              </div>
            ) : email ? (
              <Button
                size="lg"
                className="h-12 w-full rounded-xl text-sm font-semibold"
                onClick={handleResend}
                disabled={isBusy || cooldown > 0}
              >
                {isResending
                  ? "Enviando..."
                  : cooldown > 0
                    ? `Reenviar en ${formatCooldown(cooldown)}`
                    : "Reenviar correo"}
              </Button>
            ) : (
              <a
                href="/register"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Volver al registro
              </a>
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
  )
}
