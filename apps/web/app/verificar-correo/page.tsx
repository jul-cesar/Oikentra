"use client"

import { Suspense, useEffect, useSyncExternalStore } from "react"
import { useSearchParams } from "next/navigation"

import { EmailVerification } from "@/components/email-verification"

function readSearchParam(
  searchParams: ReturnType<typeof useSearchParams>,
  name: string,
): string | null {
  const value = searchParams.get(name)
  return value ? decodeURIComponent(value) : null
}

const VERIFICATION_EMAIL_STORAGE_KEY = "oikentra:verification-email"

function readVerificationEmail(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(VERIFICATION_EMAIL_STORAGE_KEY)
  } catch {
    return null
  }
}

function readTokenFromHash(): string | null {
  if (typeof window === "undefined") return null
  const hash = window.location.hash.slice(1)
  if (!hash) return null
  return new URLSearchParams(hash).get("token")
}

function subscribeHashToken() {
  return () => {}
}

function VerifyEmailPageContent() {
  const searchParams = useSearchParams()
  const hashToken = useSyncExternalStore(
    subscribeHashToken,
    readTokenFromHash,
    () => null,
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    window.history.replaceState(null, "", window.location.pathname + window.location.search)
  }, [])

  const email = useSyncExternalStore(
    subscribeHashToken,
    readVerificationEmail,
    () => null,
  )
  const token = hashToken
  const sent = searchParams.get("sent") === "1"
  const verified = searchParams.get("verified") === "1"
  const error = readSearchParam(searchParams, "error")

  // Verification tokens remain in the URL hash and are never sent as query parameters.
  // A plain ?verified=1 without a token means the provider already confirmed the address.
  if (verified && !token && !error) {
    return (
      <EmailVerification
        token={null}
        email={email}
        sent={sent}
        callbackError={null}
        verified={verified}
      />
    )
  }

  return (
    <EmailVerification
      token={token}
      email={email}
      sent={sent}
      callbackError={error}
      verified={verified}
    />
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  )
}
