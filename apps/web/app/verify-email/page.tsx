"use client"

import { Suspense, useEffect, useSyncExternalStore } from "react"
import { useSearchParams } from "next/navigation"

import { AuthShell } from "@/components/auth-shell"
import { EmailVerification } from "@/components/email-verification"

function readSearchParam(searchParams: ReturnType<typeof useSearchParams>, name: string) {
  const value = searchParams.get(name)
  return value ? decodeURIComponent(value) : null
}

const VERIFICATION_EMAIL_STORAGE_KEY = "oikentra:verification-email"

function readVerificationEmail() {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(VERIFICATION_EMAIL_STORAGE_KEY)
  } catch {
    return null
  }
}

function readTokenFromHash() {
  if (typeof window === "undefined") return null
  const hash = window.location.hash.slice(1)
  return hash ? new URLSearchParams(hash).get("token") : null
}

function subscribeHashToken() {
  return () => {}
}

function VerifyEmailPageContent() {
  const searchParams = useSearchParams()
  const token = useSyncExternalStore(subscribeHashToken, readTokenFromHash, () => null)
  const email = useSyncExternalStore(subscribeHashToken, readVerificationEmail, () => null)
  const sent = searchParams.get("sent") === "1"
  const verified = searchParams.get("verified") === "1"
  const error = readSearchParam(searchParams, "error")

  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname + window.location.search)
  }, [])

  return (
    <AuthShell>
      <EmailVerification token={token} email={email} sent={sent} callbackError={error} verified={verified} />
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return <Suspense fallback={null}><VerifyEmailPageContent /></Suspense>
}
