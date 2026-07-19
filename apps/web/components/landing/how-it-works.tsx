const steps = [
  {
    step: "01",
    title: "Crea tu espacio",
    description: "Regístrate y confirma tu correo para tener tu negocio listo para operar.",
  },
  {
    step: "02",
    title: "Registra tu operación",
    description: "Carga productos, existencias, ventas y gastos con la información que ya manejas.",
  },
  {
    step: "03",
    title: "Consulta y sincroniza",
    description: "Conoce el estado de tu caja e inventario y mantén tus dispositivos al día.",
  },
]

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="border-y border-border/60 bg-secondary/40"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Cómo funciona</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Una operación más clara en tres pasos
          </h2>
        </div>

        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <li key={item.step} className="relative">
              <span className="text-4xl font-semibold text-primary/25">{item.step}</span>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
