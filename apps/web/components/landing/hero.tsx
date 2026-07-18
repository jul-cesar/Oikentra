import { ArrowRight01Icon, ChartLineData02Icon, Tick02Icon, Wallet03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

const highlights = ["Funciona sin conexión", "Datos sincronizados", "Pensado para negocios pequeños"]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 pt-16 pb-10 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Operación simple para el día a día
          </span>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
            Saber qué vendiste, qué gastaste y cuánto tienes debería ser sencillo.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
            Oikentra es la aplicación de operaciones para pequeños negocios: registra ventas y gastos,
            controla tu inventario y caja, y continúa trabajando aunque no tengas conexión.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-12 rounded-xl px-6 text-sm font-semibold"
              render={
                <Link href="/register">
                  Conocer Oikentra
                  <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} aria-hidden="true" />
                </Link>
              }
            />
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl px-6 text-sm font-semibold"
              render={<a href="#como-funciona">Ver cómo funciona</a>}
            />
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} className="text-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14 md:mt-16">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-foreground/10 bg-[#163c35] p-2 shadow-2xl shadow-primary/15">
            <div className="overflow-hidden rounded-xl bg-background">
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                    <HugeiconsIcon icon={ChartLineData02Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  Resumen del negocio
                </div>
                <span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex">
                  Sincronizado hace un momento
                </span>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-6">
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Caja disponible</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">$ 184.250</p>
                  <div className="mt-5 flex items-end gap-1.5" aria-label="Ventas de los últimos siete días">
                    {[42, 56, 38, 72, 64, 88, 76].map((height, index) => (
                      <span key={index} className="flex-1 rounded-t-md bg-primary/20" style={{ height: `${height}px` }}>
                        <span className="block h-full rounded-t-md bg-primary" style={{ transform: `scaleY(${index === 6 ? 0.72 : 0.55})`, transformOrigin: "bottom" }} />
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-rows-2">
                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <HugeiconsIcon icon={Wallet03Icon} size={17} strokeWidth={1.8} aria-hidden="true" />
                      Gastos del mes
                    </div>
                    <p className="mt-2 text-2xl font-semibold">$ 72.800</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <p className="text-xs text-muted-foreground">Inventario</p>
                    <p className="mt-2 text-2xl font-semibold">48 productos</p>
                    <p className="mt-1 text-xs text-primary">Todo al día</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
