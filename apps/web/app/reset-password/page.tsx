import type { Metadata } from "next"

import { AuthShell } from "@/components/auth-shell"
import { PasswordReset } from "@/components/password-reset"

export const metadata: Metadata = {
  title: "Restablecer contraseña",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return <AuthShell><PasswordReset /></AuthShell>
}
