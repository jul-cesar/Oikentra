"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { cn } from "@/lib/utils"
import { authClient, getSafeRedirectPath, getSafeRedirectUrl } from "@/lib/auth-client"
import { signInSchema, type SignInFormValues } from "@/lib/validation/auth-schemas"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field"

function readRedirectParam(
  searchParams: ReturnType<typeof useSearchParams>,
): string | null {
  const raw = searchParams.get("redirect") ?? searchParams.get("redirectTo")
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const searchParams = useSearchParams()
  const redirectTo = readRedirectParam(searchParams)
  const [formError, setFormError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: SignInFormValues) {
    setFormError(null)

    const result = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: true,
    }).catch(() => {
      setFormError("Ocurrió un problema inesperado. Intenta nuevamente.")
      return null
    })
    if (!result) return

    const { error } = result
    if (error) {
      if (error.code === "EMAIL_NOT_VERIFIED") {
        try {
          window.sessionStorage.setItem("oikentra:verification-email", values.email)
        } catch {
          // Continue with the generic verification flow if browser storage is unavailable.
        }
        window.location.assign("/verify-email")
        return
      }

      setFormError("No pudimos iniciar sesión. Revisa tu correo y contraseña.")
      return
    }

    window.location.assign(getSafeRedirectPath(redirectTo, "/"))
  }

  async function handleGoogleSignIn() {
    if (isGoogleLoading) return

    setIsGoogleLoading(true)
    setFormError(null)

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: getSafeRedirectUrl(redirectTo, "/"),
    }).catch(() => {
      setFormError("Ocurrió un problema inesperado. Intenta nuevamente.")
      setIsGoogleLoading(false)
      return null
    })
    if (!result) return

    setIsGoogleLoading(false)
    const { error } = result
    if (error) {
      setFormError(error.message ?? "No pudimos iniciar sesión con Google.")
    }
  }

  return (
    <Form {...form}>
      <form
        className={cn("flex flex-col gap-6", className)}
        onSubmit={form.handleSubmit(onSubmit)}
        {...props}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Inicia sesión en tu cuenta</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Ingresa tu correo para continuar
            </p>
          </div>

          {formError ? (
            <Field>
              <FieldError className="text-center">{formError}</FieldError>
            </Field>
          ) : null}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="tu@ejemplo.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center">
                  <FormLabel>Contraseña</FormLabel>
                  <a
                     href="/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Field>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </Field>

          <FieldSeparator>O continúa con</FieldSeparator>

          <Field>
            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={form.formState.isSubmitting || isGoogleLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {isGoogleLoading ? "Iniciando sesión..." : "Iniciar sesión con Google"}
            </Button>
            <FieldDescription className="text-center">
              ¿No tienes una cuenta?{" "}
               <a href="/register" className="underline underline-offset-4">
                Regístrate
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  )
}
