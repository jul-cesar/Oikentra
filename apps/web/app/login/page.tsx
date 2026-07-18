"use client"

import { Suspense } from "react"

import { LoginForm } from "@/components/login-form"
import { AuthShell } from "@/components/auth-shell"

function LoginFormWrapper() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginFormWrapper />
    </AuthShell>
  )
}
