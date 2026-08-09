"use client";

import { useEffect, useRef, useState } from "react";
import {
	Alert02Icon,
	CheckmarkCircle02Icon,
	Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const RESEND_COOLDOWN_SECONDS = 300;

type VerificationStatus =
	| "loading"
	| "pending"
	| "verifying"
	| "success"
	| "error";

type EmailVerificationProps = {
	token?: string | null;
	email?: string | null;
	sent?: boolean;
	alreadyRegistered?: boolean;
	callbackError?: string | null;
	verified?: boolean;
};

function formatCooldown(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function normalizeCallbackError(
	error: string | null | undefined,
): string | null {
	if (!error) return null;
	return error.toLowerCase();
}

function navigateTo(url: string) {
	window.location.assign(url);
}

export function EmailVerification({
	token,
	email,
	sent = false,
	alreadyRegistered = false,
	callbackError,
	verified = false,
}: EmailVerificationProps) {
	const normalizedError = normalizeCallbackError(callbackError);
	const isInvalidLink =
		normalizedError === "invalid_token" ||
		normalizedError === "token_expired" ||
		normalizedError === "expired_token";

	const [status, setStatus] = useState<VerificationStatus>(() => {
		if (normalizedError) return "error";
		if (verified) return "success";
		if (token) return "verifying";
		return "pending";
	});
	const [message, setMessage] = useState(() => {
		if (normalizedError) {
			return "El enlace no es válido o ya venció. Solicita uno nuevo para continuar.";
		}
		if (verified)
			return "Tu correo quedó confirmado. Inicia sesión para continuar.";
		if (token) return "Estamos comprobando tu enlace.";
		if (alreadyRegistered) {
			return "Esta cuenta ya está registrada, pero todavía no ha sido confirmada. Revisa tu correo o solicita otro enlace de confirmación.";
		}
		return "Abre el enlace que te enviamos. Puede tardar un par de minutos en llegar.";
	});
	const [isResending, setIsResending] = useState(false);
	const [cooldown, setCooldown] = useState(sent ? RESEND_COOLDOWN_SECONDS : 0);
	const resendInFlightRef = useRef(false);
	const hasVerifiedRef = useRef(false);

	useEffect(() => {
		if (!token || normalizedError || hasVerifiedRef.current) return;

		hasVerifiedRef.current = true;
		let cancelled = false;

		async function verifyToken() {
			try {
				const { error } = await authClient.verifyEmail({
					query: { token: token as string },
				});

				if (cancelled) return;

				if (error) {
					setStatus("error");
					setMessage(
						"El enlace no es válido o ya venció. Solicita uno nuevo para continuar.",
					);
					return;
				}

				setStatus("success");
				setMessage("Tu correo quedó confirmado. Inicia sesión para continuar.");
			} catch {
				if (!cancelled) {
					setStatus("error");
					setMessage(
						"No pudimos comprobar el enlace. Solicita uno nuevo para continuar.",
					);
				}
			}
		}

		void verifyToken();

		return () => {
			cancelled = true;
			hasVerifiedRef.current = false;
		};
	}, [token, normalizedError]);

	useEffect(() => {
		if (cooldown === 0) return;

		const interval = setInterval(() => {
			setCooldown((current) => Math.max(0, current - 1));
		}, 1000);

		return () => clearInterval(interval);
	}, [cooldown]);

	async function handleResend() {
		if (!email || cooldown > 0 || resendInFlightRef.current) return;

		resendInFlightRef.current = true;
		setIsResending(true);
		setStatus("pending");
		setMessage("Estamos enviando un nuevo enlace a tu correo.");

		try {
			const { error: resendError } = await authClient.sendVerificationEmail({
				email: email as string,
				callbackURL: `${window.location.origin}/verify-email?verified=1`,
			});

			if (resendError) {
				setStatus("error");
				setMessage("No pudimos reenviar el correo. Intenta nuevamente.");
				return;
			}

			setCooldown(RESEND_COOLDOWN_SECONDS);
			setMessage(
				"Te enviamos un nuevo enlace. Revisa también la carpeta de spam.",
			);
		} catch {
			setStatus("error");
			setMessage("No pudimos reenviar el correo. Intenta nuevamente.");
		} finally {
			resendInFlightRef.current = false;
			setIsResending(false);
		}
	}

	const isBusy = status === "verifying" || isResending;
	const isSuccess = status === "success";
	const isError = status === "error";


	const title = isSuccess
		? "Correo confirmado"
		: isError
			? isInvalidLink
				? "El enlace venció"
				: "No pudimos confirmar tu correo"
			: alreadyRegistered
				? "Cuenta pendiente de confirmación"
				: "Confirma tu correo";

	return (
		<div className="w-full">
			<Card className="gap-0 overflow-hidden rounded-[2rem] border-border/60 bg-card/95 py-0 shadow-2xl shadow-primary/10 backdrop-blur">
				<CardHeader className="items-center gap-5 px-6 pt-8 pb-5 text-center sm:px-8 sm:pt-10">

					<div className="space-y-3">
						<CardTitle className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
							{title}
						</CardTitle>
						{email && status !== "success" ? (
							<p className="mx-auto w-fit max-w-full rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm">
								{email}
							</p>
						) : null}
						<CardDescription className="text-pretty text-base leading-7">
							{isSuccess || isError || alreadyRegistered
								? message
								: "Te enviamos un enlace para activar tu cuenta. Revisa tu bandeja de entrada y también spam o promociones."}
						</CardDescription>
					</div>
				</CardHeader>

				{!isSuccess && !isError ? (
					<div className="mx-6 rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground sm:mx-8">
						<p className="font-medium text-foreground">Siguiente paso</p>
						<ol className="mt-2 list-decimal space-y-1 pl-5">
							<li>Abre el correo de Oikentra.</li>
							<li>Presiona “Confirmar correo”.</li>
							<li>Vuelve aquí e inicia sesión.</li>
						</ol>
					</div>
				) : null}

				<CardContent className="px-6 pt-5 pb-7 sm:px-8 sm:pb-8">
					{isSuccess ? (
						<div className="flex flex-col gap-3">
							<Button
								size="lg"
								className="h-12 w-full rounded-xl text-sm font-semibold"
								onClick={() => navigateTo("/login")}
							>
								Iniciar sesión
							</Button>
							<Button
								type="button"
								variant="outline"
								size="lg"
								className="h-12 w-full rounded-xl text-sm font-semibold"
								onClick={() => navigateTo("oikentra://auth/verify?verified=1")}
							>
								Abrir en la app
							</Button>
						</div>
					) : email ? (
						<div className="flex flex-col gap-3">
							<Button
								size="lg"
								className="h-12 w-full rounded-xl text-sm font-semibold"
								onClick={handleResend}
								disabled={isBusy || cooldown > 0}
							>
								{isResending
									? "Enviando..."
									: cooldown > 0
										? `Reenviar en ${formatCooldown(cooldown)}`
										: "Reenviar enlace"}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="lg"
								className="h-12 w-full rounded-xl text-sm font-semibold"
								onClick={() => navigateTo("/login")}
							>
								Ya confirmé, iniciar sesión
							</Button>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							<Button
								size="lg"
								className="h-12 w-full rounded-xl text-sm font-semibold"
								onClick={() => navigateTo("/login")}
							>
								Ir a iniciar sesión
							</Button>
							<Button
								type="button"
								variant="outline"
								size="lg"
								className="h-12 w-full rounded-xl text-sm font-semibold"
								onClick={() => navigateTo("/register")}
							>
								Crear otra cuenta
							</Button>
						</div>
					)}

					<p
						className="mt-5 text-center text-xs leading-5 text-muted-foreground"
						aria-live="polite"
					>
						{isSuccess
							? "Tu cuenta ya está activa."
							: "Por seguridad, cada enlace funciona una sola vez y vence después de un tiempo."}
					</p>
				</CardContent>
			</Card>

			<p className="mt-6 text-center text-xs text-muted-foreground">
				¿Necesitas ayuda?{" "}
				<button
					type="button"
					className="font-medium text-foreground underline-offset-4 hover:underline"
					onClick={() => navigateTo("mailto:soporte@oikentra.com")}
				>
					soporte@oikentra.com
				</button>
			</p>
		</div>
	);
}
