"use client";

import { startTransition, useEffect, useState } from "react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  LockPasswordIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import Link from "next/link";

import { readTokenFromHash } from "@/lib/reset-token";
import { canonicalResetPasswordSchema } from "@/lib/validation/auth-schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ResetPasswordState = "loading" | "ready" | "submitting" | "success" | "error";

export function PasswordReset() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<ResetPasswordState>("loading");
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    const resetToken = readTokenFromHash();

    window.history.replaceState(null, "", window.location.pathname);

    if (!resetToken) {
      startTransition(() => {
        setMessage("Este enlace no contiene la información necesaria para restablecer tu contraseña.");
        setState("error");
      });
      return;
    }

    startTransition(() => {
      setToken(resetToken);
      setState("ready");
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || state === "submitting") return;

    setFieldErrors({});
    setMessage("");

    const validation = canonicalResetPasswordSchema.safeParse({
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const errors: { newPassword?: string; confirmPassword?: string } = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0];
        if (path === "newPassword") errors.newPassword = issue.message;
        if (path === "confirmPassword") errors.confirmPassword = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setState("submitting");

    try {
      const response = await fetch("/api/restablecer-contrasena", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": crypto.randomUUID(),
        },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        setMessage(
          response.status === 429
            ? "Se hicieron demasiados intentos. Espera unos minutos y vuelve a intentarlo."
            : body.code === "INVALID_PASSWORD"
              ? "La contraseña no cumple con los requisitos. Usa entre 8 y 128 caracteres."
              : "El enlace no es válido o ya venció. Solicita uno nuevo desde Oikentra.",
        );
        setState("error");
        return;
      }

      setToken(null);
      setNewPassword("");
      setConfirmPassword("");
      setState("success");
    } catch {
      setMessage("No pudimos conectar con Oikentra. Revisa tu conexión e intenta nuevamente.");
      setState("error");
    }
  }

  const isSuccess = state === "success";
  const isError = state === "error";
  const isBusy = state === "loading" || state === "submitting";

  const statusIcon = isSuccess
    ? CheckmarkCircle02Icon
    : isError
      ? Alert02Icon
      : isBusy
        ? Loading03Icon
        : LockPasswordIcon;

  return (
    <div className="w-full">
        <Card className="gap-0 overflow-hidden rounded-3xl border-border/60 bg-card/95 py-0 shadow-xl shadow-primary/5 backdrop-blur">
          <CardHeader className="items-center gap-4 px-7 pt-9 pb-5 text-center">
            <span
              className={`grid size-16 place-items-center rounded-2xl ${
                isSuccess
                  ? "bg-primary/10 text-primary"
                  : isError
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
              }`}
              aria-hidden="true"
            >
              <HugeiconsIcon
                icon={statusIcon}
                size={30}
                strokeWidth={1.8}
                className={isBusy ? "animate-spin" : undefined}
              />
            </span>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight text-balance">
                {isSuccess
                  ? "Contraseña actualizada"
                  : isError
                    ? "No pudimos actualizar tu contraseña"
                    : "Restablecer contraseña"}
              </CardTitle>
              <CardDescription className="text-pretty text-base leading-6">
                {isSuccess
                  ? "Tu contraseña fue cambiada. Vuelve a Oikentra e inicia sesión para continuar."
                  : isError
                    ? message
                    : "Elegí una contraseña segura. El enlace es personal y vence por seguridad."}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-7 pb-8">
            {isSuccess ? (
              <div className="flex flex-col gap-3">
                <a
                  href="oikentra://auth/reset-password?verified=1"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Abrir Oikentra
                </a>
                <Link
                  href="/"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Volver a oikentra.com
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                    Nueva contraseña
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={isBusy || !token}
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                    placeholder="Mínimo 8 caracteres"
                  />
                  {fieldErrors.newPassword ? (
                    <p className="text-sm text-destructive">{fieldErrors.newPassword}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={isBusy || !token}
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                    placeholder="Repetí tu contraseña"
                  />
                  {fieldErrors.confirmPassword ? (
                    <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full rounded-xl text-sm font-semibold"
                  disabled={!token || isBusy}
                >
                  {state === "submitting" ? "Guardando..." : "Guardar contraseña"}
                </Button>
              </form>
            )}

            <p
              className="mt-5 text-center text-xs leading-5 text-muted-foreground"
              aria-live="polite"
            >
              {isSuccess
                ? "Ya puedes cerrar esta página."
                : "El enlace es personal y vence por seguridad."}
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Necesitas ayuda?{" "}
          <a
            href="mailto:soporte@oikentra.com"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            soporte@oikentra.com
          </a>
        </p>
    </div>
  );
}
