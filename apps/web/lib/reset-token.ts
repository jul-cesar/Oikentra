"use client";

export function readTokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return new URLSearchParams(hash).get("token");
}
