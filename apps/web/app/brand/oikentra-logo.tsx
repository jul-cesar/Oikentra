import { cn } from "@/lib/utils"

type OikentraLogoProps = {
  className?: string
  showWordmark?: boolean
}

export function OikentraLogo({ className, showWordmark = true }: OikentraLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2.25" />
          <path
            d="M9 12.4l2 2 4-4.4"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className="text-lg font-bold tracking-tight text-foreground">Oikentra</span>
      ) : null}
    </span>
  )
}
