"use client";

import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { useOnlineStatus } from "@/hooks/use-online-status";

const LAST_USER_KEY = "oikentra.lastUser";

function getLastUser() {
	if (typeof window === "undefined" || navigator.onLine) return null;

	try {
		return JSON.parse(window.localStorage.getItem(LAST_USER_KEY) ?? "null");
	} catch {
		return null;
	}
}

export function getLastUserId() {
	if (typeof window === "undefined") return "anonymous";
	return window.localStorage.getItem(LAST_USER_KEY + ".id") ?? "anonymous";
}

export function clearLastUser() {
	window.localStorage.removeItem(LAST_USER_KEY);
	window.localStorage.removeItem(LAST_USER_KEY + ".id");
}

export function useSession() {
	const query = authClient.useSession();
	const isOnline = useOnlineStatus();
	const offlineUser = !isOnline ? getLastUser() : null;

	useEffect(() => {
		const user = query.data?.user;
		if (!user) return;

		window.localStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
		window.localStorage.setItem(LAST_USER_KEY + ".id", user.id);
	}, [query.data?.user]);

	return {
		user: query.data?.user ?? offlineUser,
		session: query.data?.session ?? null,
		isPending: query.isPending && !offlineUser,
		isRefetching: query.isRefetching,
		error: query.error && !offlineUser ? query.error : null,
		refetch: query.refetch,
	};
}
