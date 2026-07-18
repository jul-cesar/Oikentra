import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft01Icon, CreditCardIcon, UserGroupIcon, WifiDisconnected02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { LoginForm } from "@/components/login-form"
import { OikentraLogo } from "../brand/oikentra-logo"


export const metadata: Metadata = {
  title: "Iniciar sesión — Oikentra",
  description: "Entra a Oikentra para gestionar la caja, los clientes y los fiados de tu negocio.",
}

const chips = [
  { icon: CreditCardIcon, label: "Caja al día" },
  { icon: UserGroupIcon, label: "Clientes y fiados" },

]

export default function LoginPage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-5 py-10">
      {/* Fondo ambiental */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-chart-3/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            color: "var(--muted-foreground)",
            opacity: 0.08,
          }}
        />
      </div>

      <Link
        href="/"
        className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:left-8 md:top-8"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={17} strokeWidth={2} aria-hidden="true" />
        Volver al inicio
      </Link>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <OikentraLogo />
          <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Tu negocio, siempre bajo control
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance">
            Bienvenido de nuevo
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
            Ingresa para ver tu caja, tus clientes y los fiados del día.
          </p>
        </div>

        <div className="mt-8">
          <LoginForm />
        </div>

        <ul className="mt-9 flex flex-wrap items-center justify-center gap-2">
          {chips.map((chip) => (
            <li
              key={chip.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
            >
              <HugeiconsIcon icon={chip.icon} size={15} strokeWidth={1.8} className="text-primary" aria-hidden="true" />
              {chip.label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
