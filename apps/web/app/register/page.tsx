import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { OikentraLogo } from "../brand/oikentra-logo"
import RegisterForm from "@/components/sign-up-form"



export const metadata: Metadata = {
  title: "Crea tu negocio — Oikentra",
  description: "Crea tu cuenta en Oikentra y empieza a gestionar la caja, los clientes y los fiados de tu negocio.",
}

const benefits = ["Gratis para empezar", "Sin tarjeta de crédito", "Listo en 2 minutos"]

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-5 py-10">
      {/* Fondo ambiental */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-chart-3/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
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
            Empieza a ordenar tu negocio hoy
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance">Crea tu negocio</h1>
          <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
            Registra tu caja, tus clientes y sus fiados en un solo lugar.
          </p>
        </div>

        <div className="mt-8">
          <RegisterForm />
        </div>

        <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {benefits.map((benefit) => (
            <li key={benefit} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={15}
                strokeWidth={1.8}
                className="text-primary"
                aria-hidden="true"
              />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
