import Link from "next/link"
import { Store01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

type AuthShellProps = {
  children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-svh bg-background px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-2xl shadow-primary/10 lg:min-h-[calc(100svh-3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(25rem,0.9fr)]">
        <section className="flex flex-col px-6 py-6 sm:px-10 sm:py-8 lg:px-16 lg:py-10">
          <Link href="/" className="flex w-fit items-center gap-2.5 text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <HugeiconsIcon icon={Store01Icon} size={20} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="text-xl font-semibold tracking-tight">Oikentra</span>
          </Link>
          <div className="flex flex-1 items-center justify-center py-12 sm:py-16">
            <div className="w-full max-w-lg">{children}</div>
          </div>
        </section>

        <aside className="auth-visual relative hidden overflow-hidden bg-[#163c35] px-10 py-12 text-[#f5f1e8] lg:flex lg:flex-col lg:justify-between xl:px-14">
          <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#d8a45f]/20 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d8a45f]">Operación en calma</p>
            <h2 className="mt-5 max-w-md text-4xl font-semibold leading-tight tracking-tight text-balance">
              Todo lo importante de tu negocio, en una sola mirada.
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-[#dce8df]/75">
              Ventas, caja e inventario conectados para que puedas decidir con claridad, incluso sin conexión.
            </p>
          </div>

          <div className="auth-visual-card relative rounded-[1.75rem] border border-white/15 bg-[#0f2c28]/80 p-5 shadow-2xl backdrop-blur-sm" aria-label="Vista ilustrada del resumen operativo de Oikentra">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs text-[#dce8df]/60">Resumen de hoy</p>
                <p className="mt-1 text-lg font-semibold">Mi negocio</p>
              </div>
              <span className="rounded-full bg-[#a8d5ba]/15 px-3 py-1 text-xs font-medium text-[#bfe8cb]">Sincronizado</span>
            </div>
            <div className="mt-5 grid grid-cols-[1.15fr_0.85fr] gap-3">
              <div className="rounded-2xl bg-[#f5f1e8] p-4 text-[#163c35]">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] opacity-60">Caja disponible</p>
                <p className="mt-2 text-2xl font-semibold">$184.250</p>
                <div className="mt-5 flex h-16 items-end gap-1.5" aria-hidden="true">
                  {[35, 48, 28, 54, 42, 63, 51].map((height, index) => (
                    <span key={index} className="flex-1 rounded-t bg-[#86b99b]/35" style={{ height: `${height}px` }}>
                      <span className="block h-2/3 rounded-t bg-[#4f9676]" />
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-[0.65rem] text-[#dce8df]/60">Ventas</p>
                  <p className="mt-2 text-xl font-semibold">$72.800</p>
                </div>
                <div className="rounded-2xl bg-[#d8a45f]/15 p-4">
                  <p className="text-[0.65rem] text-[#f4d6a8]/75">Inventario</p>
                  <p className="mt-2 text-xl font-semibold">48 items</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
