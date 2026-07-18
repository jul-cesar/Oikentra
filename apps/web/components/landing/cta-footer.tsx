import { ArrowRight01Icon, Store01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function CtaFooter() {
  return (
    <>
      <section id="empezar" className="mx-auto w-full max-w-6xl px-5 py-20 md:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12 md:py-20">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary-foreground/10 blur-2xl"
            aria-hidden="true"
          />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Lleva claridad a cada decisión del negocio
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-base leading-relaxed text-pretty text-primary-foreground/80">
            Empieza a registrar tu operación y consulta lo importante desde cualquier dispositivo.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="h-12 rounded-xl px-6 text-sm font-semibold"
              render={
                <Link href="/register">
                  Empezar con Oikentra
                  <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} aria-hidden="true" />
                </Link>
              }
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5 text-foreground">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <HugeiconsIcon icon={Store01Icon} size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">Oikentra</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Oikentra. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </>
  )
}
