import { ChartLineData02Icon, CloudSyncIcon, Package02Icon, ReceiptDollarIcon, Store01Icon, Wallet03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const features = [
  {
    icon: Package02Icon,
    title: "Inventario visible",
    description: "Registra tus productos y existencias para saber qué tienes disponible.",
  },
  {
    icon: ReceiptDollarIcon,
    title: "Ventas y gastos",
    description: "Anota lo que entra y lo que sale para entender el movimiento real de tu negocio.",
  },
  {
    icon: ChartLineData02Icon,
    title: "Visibilidad de caja",
    description: "Consulta cuánto tienes, cuánto vendiste y cómo evoluciona tu operación.",
  },
  {
    icon: CloudSyncIcon,
    title: "Sincronización entre dispositivos",
    description: "Trabaja desde distintos dispositivos y conserva la información actualizada.",
  },
  {
    icon: Wallet03Icon,
    title: "Control diario",
    description: "Ordena la operación sin planillas dispersas ni cálculos a mano.",
  },
  {
    icon: Store01Icon,
    title: "Hecho para tu negocio",
    description: "Una herramienta práctica para trabajar con el ritmo de un pequeño negocio.",
  },
]

export function Features() {
  return (
    <section id="caracteristicas" className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-primary">Lo esencial para operar mejor</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Una vista completa de tu negocio
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">
          Oikentra reúne ventas, gastos, inventario y caja en un solo lugar, incluso cuando trabajas sin conexión.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-border/70 bg-card p-6 transition-colors hover:border-primary/40"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={feature.icon} size={22} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
