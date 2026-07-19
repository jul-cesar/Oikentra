"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/lib/validation/auth-schemas"
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
} from "@/components/ui/field"

function readTokenFromHash(): string | null {
  if (typeof window === "undefined") return null
  const hash = window.location.hash.slice(1)
  if (!hash) return null
  return new URLSearchParams(hash).get("token")
}

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [token] = useState(readTokenFromHash)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    window.history.replaceState(null, "", window.location.pathname + window.location.search)
  }, [])

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    setFormError(null)

    if (!token) {
      setFormError("El enlace no es válido o ya venció. Solicita uno nuevo.")
      return
    }

    const result = await authClient.resetPassword({
      newPassword: values.password,
      token,
    }).catch(() => {
      setFormError("Ocurrió un problema inesperado. Intenta nuevamente.")
      return null
    })
    if (!result) return

    const { error } = result
    if (error) {
      if (error.code === "INVALID_TOKEN" || error.code === "TOKEN_EXPIRED") {
        setFormError("El enlace no es válido o ya venció. Solicita uno nuevo.")
      } else {
        setFormError("No pudimos restablecer tu contraseña. Intenta nuevamente.")
      }
      return
    }

    setIsSuccess(true)

    setTimeout(() => {
      window.location.assign("/login")
    }, 2000)
  }

  if (!token && !isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Enlace no válido</h1>
            <p className="text-sm text-balance text-muted-foreground">
              El enlace para restablecer tu contraseña no es válido o ya venció.
            </p>
          </div>
          <Field>
            <a
               href="/forgot-password"
              className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap text-foreground transition-all outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50"
            >
              Solicitar nuevo enlace
            </a>
          </Field>
        </FieldGroup>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Contraseña actualizada</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Tu contraseña se restableció correctamente. Te redirigimos para que inicies sesión.
            </p>
          </div>
          <Field>
            <a
              href="/login"
              className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-all outline-none select-none hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50"
            >
              Iniciar sesión
            </a>
          </Field>
        </FieldGroup>
      </div>
    )
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
            <h1 className="text-2xl font-bold">Restablece tu contraseña</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Elige una contraseña nueva para tu cuenta.
            </p>
          </div>

          {formError ? (
            <Field>
              <FieldError className="text-center">{formError}</FieldError>
            </Field>
          ) : null}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Field>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Restableciendo..." : "Restablecer contraseña"}
            </Button>
          </Field>

          <FieldDescription className="text-center">
            ¿Recordaste tu contraseña?{" "}
            <a href="/login" className="underline underline-offset-4">
              Inicia sesión
            </a>
          </FieldDescription>
        </FieldGroup>
      </form>
    </Form>
  )
}
