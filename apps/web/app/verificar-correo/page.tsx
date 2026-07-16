import type { Metadata } from "next";

import { EmailVerification } from "@/components/email-verification";

export const metadata: Metadata = {
  title: "Confirmar correo",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return <EmailVerification />;
}
