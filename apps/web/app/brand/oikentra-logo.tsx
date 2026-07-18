import { cn } from "@/lib/utils";

type OikentraLogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: {
    icon: "size-8",
    text: "text-base",
  },
  md: {
    icon: "size-11",
    text: "text-xl",
  },
  lg: {
    icon: "size-16",
    text: "text-3xl",
  },
} as const;

export function OikentraLogo({
  className,
  showWordmark = true,
  size = "md",
}: OikentraLogoProps) {
  const styles = sizes[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-[#075B3A]",
        className,
      )}
    >
     <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 638 592"
        aria-hidden={showWordmark}
        aria-label={showWordmark ? undefined : "Oikentra"}
        className="size-11 shrink-0"
      >
        <g fill="currentColor">
          <path d="M342 21C190 27 77 125 48 251 15 398 101 521 235 548 355 573 453 493 463 363 473 238 421 143 351 117 321 106 292 125 276 175 305 158 332 159 355 174 400 203 418 272 414 333 409 421 357 490 285 500 190 514 103 432 95 319 84 169 180 57 342 21Z" />

          <path d="M296 571C448 565 561 467 590 341 623 194 537 71 403 44 283 19 185 99 175 229 165 354 217 449 287 475 317 486 346 467 362 417 333 434 306 433 283 418 238 389 220 320 224 259 229 171 281 102 353 92 448 78 535 160 543 273 554 423 458 535 296 571Z" />
        </g>
      </svg>

      {showWordmark && (
        <span
          className={cn(
            "font-bold leading-none tracking-tight text-foreground",
            styles.text,
          )}
        >
          Oikentra
        </span>
      )}
    </span>
  );
}
