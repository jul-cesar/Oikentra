import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { OikentraLogo } from "../brand/oikentra-logo";
import { AuthEntryGate } from "@/components/auth-entry-gate";
import { LoginForm } from "@/components/login-form";
import { BeamsBackground } from "@/components/ui/beams-background";

export const metadata: Metadata = {
	title: "Iniciar sesión — Oikentra",
	description:
		"Entra a Oikentra para gestionar la caja, los clientes y los fiados de tu negocio.",
};

export default function LoginPage() {
	return (
		<AuthEntryGate>
			<BeamsBackground intensity="strong">
				<main className="relative flex w-full items-center justify-center px-5  sm:px-6 lg:px-8">


					<div className=" rounded-[2rem]   px-5 py-5  sm:px-8 sm:py-9">
						<div className="flex flex-col items-center text-center">
							<OikentraLogo size="lg" />

							<h1 className="mt-5 text-2xl font-bold tracking-tight text-balance sm:text-4xl">
								Bienvenido de nuevo
							</h1>
							<p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
								Ingresa para ver tu caja, tus clientes y los fiados del día.
							</p>
						</div>

						<div className="mt-7 sm:mt-8">
							<LoginForm />
						</div>
					</div>
				</main>
			</BeamsBackground>
		</AuthEntryGate>
	);
}
