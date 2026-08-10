"use client";

import { useState } from "react";
import { Store01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import type { Business } from "@/lib/onboarding-api";

type BusinessLogoProps = {
	business: Pick<Business, "name" | "logoUrl">;
	className?: string;
	imgClassName?: string;
	iconClassName?: string;
};

export function BusinessLogo({
	business,
	className,
	imgClassName,
	iconClassName,
}: BusinessLogoProps) {
	const [failed, setFailed] = useState(false);
	const logoUrl = business.logoUrl && !failed ? business.logoUrl : null;

	return (
		<span
			className={cn(
				"flex items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground",
				className,
			)}
		>
			{logoUrl ? (
				<img
					src={logoUrl}
					alt={`Logo de ${business.name}`}
					className={cn("size-full object-cover", imgClassName)}
					onError={() => setFailed(true)}
				/>
			) : (
				<HugeiconsIcon
					icon={Store01Icon}
					strokeWidth={2}
					className={cn("size-4", iconClassName)}
					aria-hidden="true"
				/>
			)}
		</span>
	);
}
