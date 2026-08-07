import Link from "next/link"

import { Button } from "@/components/ui/button"
import { OikentraLogo } from "@/app/brand/oikentra-logo"

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
         <OikentraLogo size="md" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
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
