import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type DashboardPageProps = ComponentProps<"div"> & {
	width?: "default" | "wide";
};

export function DashboardPage({
	width = "default",
	className,
	...props
}: DashboardPageProps) {
	return (
		<div
			className={cn(
				"mx-auto w-full space-y-5 sm:space-y-6",
				width === "default" ? "max-w-5xl" : "max-w-none",
				className,
			)}
			{...props}
		/>
	);
}
