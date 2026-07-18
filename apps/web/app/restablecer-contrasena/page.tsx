import type { Metadata } from "next";

import { PasswordReset } from "@/components/password-reset";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <PasswordReset />;
}
