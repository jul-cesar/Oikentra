"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { OikentraLogo } from "@/app/brand/oikentra-logo";
import type { OikentraChatProps } from "@/components/ai/oikentra-chat";
import { Button } from "@/components/ui/button";

function Launcher({
	onClick,
	disabled = false,
}: {
	onClick?: () => void;
	disabled?: boolean;
}) {
	return (
		<div className="fixed right-4 bottom-4 z-50">
			<Button
				type="button"
				size="icon-lg"
				aria-label="Abrir asistente Oikentra"
				className="size-14 rounded-2xl shadow-2xl shadow-primary/20"
				disabled={disabled}
				onClick={onClick}
			>
				<OikentraLogo
					showWordmark={false}
					size="sm"
					className="text-primary-foreground"
				/>
			</Button>
		</div>
	);
}

const OikentraChat = dynamic(
	() =>
		import("@/components/ai/oikentra-chat").then(
			(module) => module.OikentraChat,
		),
	{ ssr: false, loading: () => <Launcher disabled /> },
);

export function OikentraChatLauncher({ business }: OikentraChatProps) {
	const [loaded, setLoaded] = useState(false);

	return loaded ? (
		<OikentraChat business={business} initiallyOpen />
	) : (
		<Launcher onClick={() => setLoaded(true)} />
	);
}
