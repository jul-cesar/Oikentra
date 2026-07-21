import { OikentraLogo } from "@/app/brand/oikentra-logo"
import { cn } from "@/lib/utils"

type OikentraLoaderProps = {
  label?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

const logoSize = { sm: "sm", md: "md", lg: "lg" } as const

export function OikentraLoader({ label = "Preparando tu espacio", className, size = "md" }: OikentraLoaderProps) {
  return (
    <div className={cn(className, "fixed inset-0 z-50 flex min-h-svh w-full flex-col items-center justify-center gap-5 bg-background/80 text-center backdrop-blur-sm")} role="status" aria-live="polite">
      <div className="relative grid place-items-center">
        <span className="absolute size-20 animate-[spin_4s_linear_infinite] rounded-full border border-primary/15 border-t-primary/80" aria-hidden="true" />
        <span className="absolute size-14 animate-[spin_2.4s_linear_infinite_reverse] rounded-full border border-primary/10 border-b-primary/50" aria-hidden="true" />
        <span className="relative grid size-11 place-items-center animate-pulse rounded-2xl bg-primary/10 text-primary shadow-sm shadow-primary/20"><OikentraLogo showWordmark={false} size={logoSize[size]} className="text-primary" /></span>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}<span className="inline-flex w-5 text-left" aria-hidden="true"><span className="animate-[pulse_1.2s_ease-in-out_infinite]">...</span></span></span>
    </div>
  )
}
