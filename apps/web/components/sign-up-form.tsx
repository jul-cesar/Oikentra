"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowRight01Icon,
  MailAtSign01Icon,
  SquareLock02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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
import { authClient, getSafeAuthErrorMessage } from "@/lib/auth-client"
import {
  signUpSchema,
  type SignUpFormValues,
} from "@/lib/validation/auth-schemas"

export default function RegisterForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: SignUpFormValues) {
    if (isPending) return

    setError(null)
    setIsPending(true)
    try {
      // Better Auth requires a name even though registration only collects credentials.
      const { error: signUpError } = await authClient.signUp.email({
        name: values.email.split("@")[0],
        email: values.email,
        password: values.password,
        callbackURL: `${window.location.origin}/verify-email?verified=1`,
      })
      if (signUpError) {
        setError(getSafeAuthErrorMessage(signUpError, "No pudimos crear tu cuenta. Intenta nuevamente."))
        return
      }
      router.replace(`/verify-email?email=${encodeURIComponent(values.email)}&sent=1`)
    } catch {
      setError("Ocurrió un problema inesperado. Intenta nuevamente.")
    } finally {
      setIsPending(false)
    }
  }

  async function handleGoogleSignUp() {
    if (isPending) return
    setError(null)
    setIsPending(true)
    try {
      const { error: signInError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/dashboard`,
      })
      if (signInError) {
        setError(getSafeAuthErrorMessage(signInError, "No pudimos crear tu cuenta con Google. Intenta nuevamente."))
      }
    } catch {
      setError("No pudimos crear tu cuenta con Google. Intenta nuevamente.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" aria-busy={isPending}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <FormLabel htmlFor="email" className="text-sm font-medium text-foreground">Correo del negocio</FormLabel>
              <FormControl>
                <div className="group relative">
                  <HugeiconsIcon icon={MailAtSign01Icon} size={19} strokeWidth={1.8} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
                  <Input {...field} id="email" type="email" autoComplete="email" placeholder="tu@negocio.com" className="h-12 rounded-xl border-border bg-card pl-11 pr-4 text-sm shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/15" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <FormLabel htmlFor="password" className="text-sm font-medium text-foreground">Contraseña</FormLabel>
              <FormControl>
                <div className="group relative">
                  <HugeiconsIcon icon={SquareLock02Icon} size={19} strokeWidth={1.8} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
                  <Input {...field} id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="h-12 rounded-xl border-border bg-card pl-11 pr-11 text-sm shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/15" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    <HugeiconsIcon icon={showPassword ? ViewOffSlashIcon : ViewIcon} size={18} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <label className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 rounded-[6px] border-border text-primary accent-primary" />
          <span>Acepto los <Link href="/terminos" className="font-medium text-primary underline-offset-4 hover:underline">términos</Link> y la <Link href="/privacidad" className="font-medium text-primary underline-offset-4 hover:underline">política de privacidad</Link>.</span>
        </label>
        {error ? <p className="text-sm text-destructive" role="alert" aria-live="polite">{error}</p> : null}
        <Button type="submit" size="lg" className="mt-1 h-12 w-full rounded-xl text-sm font-semibold" disabled={isPending}>
          {isPending ? "Creando cuenta..." : "Crear mi negocio"}
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} aria-hidden="true" />
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span>o continúa con</span><span className="h-px flex-1 bg-border" /></div>
        <Button type="button" variant="outline" size="lg" className="h-12 w-full rounded-xl" onClick={handleGoogleSignUp} disabled={isPending}>
          <span className="grid size-5 place-items-center rounded-full border border-border text-xs font-bold" aria-hidden="true">G</span>
          {isPending ? "Conectando..." : "Continuar con Google"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">Inicia sesión</Link></p>
      </form>
    </Form>
  )
}
