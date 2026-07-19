"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/validation/auth-schemas"
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

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setFormError(null)

    const requestId = crypto.randomUUID()

    const result = await authClient.requestPasswordReset({
      email: values.email,
       redirectTo: `${window.location.origin}/reset-password`,
      fetchOptions: {
        headers: {
          "X-Request-Id": requestId,
        },
      },
    }).catch(() => {
      setFormError("Ocurrió un problema inesperado. Intenta nuevamente.")
      return null
    })
    if (!result) return

    const { error } = result
    if (error) {
      setFormError(
        error.code === "PASSWORD_RESET_NOT_AVAILABLE"
          ? "Esta cuenta solo usa Google. Inicia sesión con Google para continuar."
          : "No pudimos enviar el correo. Intenta nuevamente.",
      )
      return
    }

    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Revisa tu correo</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Si tu correo está registrado, recibirás instrucciones para restablecer tu contraseña.
            </p>
          </div>
          <Field>
            <a
              href="/login"
              className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap text-foreground transition-all outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50"
            >
              Volver a iniciar sesión
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
            <h1 className="text-2xl font-bold">¿Olvidaste tu contraseña?</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Ingresa tu correo y te enviaremos un enlace seguro para restablecerla.
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

          <Field>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Enviando..." : "Enviar instrucciones"}
            </Button>
          </Field>

          <FieldDescription className="text-center">
            ¿Recuerdas tu contraseña?{" "}
            <a href="/login" className="underline underline-offset-4">
              Inicia sesión
            </a>
          </FieldDescription>
        </FieldGroup>
      </form>
    </Form>
  )
}
