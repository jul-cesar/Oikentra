import Link from "next/link"

import { OikentraLogo } from "@/app/brand/oikentra-logo"
import { BeamsBackground } from "@/components/ui/beams-background"

type AuthShellProps = {
  children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <BeamsBackground intensity="medium">
      <main className="relative flex min-h-svh w-full flex-col px-5 py-6 sm:px-8 sm:py-8">
        <Link
          href="/"
          aria-label="Volver al inicio"
          className="mx-auto inline-flex w-fit rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <OikentraLogo size="md" />
        </Link>

        <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="w-full max-w-lg">{children}</div>
        </div>
      </main>
    </BeamsBackground>
  )
}
