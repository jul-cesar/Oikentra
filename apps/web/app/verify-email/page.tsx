"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { EmailVerification } from "@/components/email-verification";

function readSearchParam(
	searchParams: ReturnType<typeof useSearchParams>,
	name: string,
) {
	const value = searchParams.get(name);
	return value ? decodeURIComponent(value) : null;
}

const VERIFICATION_EMAIL_STORAGE_KEY = "oikentra:verification-email";

function readVerificationEmail() {
	if (typeof window === "undefined") return null;
	try {
		return window.sessionStorage.getItem(VERIFICATION_EMAIL_STORAGE_KEY);
	} catch {
		return null;
	}
}

function readTokenFromHash() {
	if (typeof window === "undefined") return null;
	const hash = window.location.hash.slice(1);
	return hash ? new URLSearchParams(hash).get("token") : null;
}

function readTokenFromLocation() {
	if (typeof window === "undefined") return null;
	const url = new URL(window.location.href);
	return url.searchParams.get("token") ?? readTokenFromHash();
}

function sanitizeVerifyEmailUrl() {
	const url = new URL(window.location.href);
	url.searchParams.delete("token");
	url.hash = "";
	return `${url.pathname}${url.search}`;
}

function subscribeHashToken() {
	return () => {};
}

function VerifyEmailPageContent() {
	const searchParams = useSearchParams();
	const token = useSyncExternalStore(
		subscribeHashToken,
		readTokenFromHash,
		() => null,
	);
	const storedEmail = useSyncExternalStore(
		subscribeHashToken,
		readVerificationEmail,
		() => null,
	);
	const [initialToken] = useState(readTokenFromLocation);
	const tokenParam = readSearchParam(searchParams, "token");
	const verificationToken = initialToken ?? tokenParam ?? token;
	const emailParam = readSearchParam(searchParams, "email");
	const email = emailParam ?? storedEmail;
	const sent = searchParams.get("sent") === "1";
	const alreadyRegistered = searchParams.get("registered") === "1";
	const verified = searchParams.get("verified") === "1";
	const error = readSearchParam(searchParams, "error");

	useEffect(() => {
		if (emailParam) {
			try {
				window.sessionStorage.setItem(
					VERIFICATION_EMAIL_STORAGE_KEY,
					emailParam,
				);
			} catch {
				// sessionStorage can be unavailable in private browsing; the query param still renders this visit.
			}
		}
		window.history.replaceState(null, "", sanitizeVerifyEmailUrl());
	}, [emailParam]);

	return (
		<AuthShell>
			<EmailVerification
				token={verificationToken}
				email={email}
				sent={sent}
				alreadyRegistered={alreadyRegistered}
				callbackError={error}
				verified={verified}
			/>
		</AuthShell>
	);
}

export default function VerifyEmailPage() {
	return (
		<Suspense fallback={null}>
			<VerifyEmailPageContent />
		</Suspense>
	);
}
