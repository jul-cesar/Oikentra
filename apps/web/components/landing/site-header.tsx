import Link from "next/link"
import { Store01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"

const navItems = [
  { label: "Características", href: "#caracteristicas" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Empezar", href: "#empezar" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5 text-foreground">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <HugeiconsIcon icon={Store01Icon} size={19} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Oikentra</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="hidden sm:inline-flex"
            render={<Link href="/login">Iniciar sesión</Link>}
          />
          <Button className="rounded-xl" render={<Link href="/register">Probar Oikentra</Link>} />
        </div>
      </div>
    </header>
  )
}
