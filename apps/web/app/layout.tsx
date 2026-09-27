import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "@/app/providers";
import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/toast";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Oikentra",
		template: "%s | Oikentra",
	},
	description: "Control simple de caja y fiados para pequeños negocios.",
	icons: { icon: "/icons/icon.svg" },
};

export const viewport = {
	themeColor: "#d4f5e5",
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			lang="es"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="flex min-h-full flex-col">
				<PwaRegister />
				<Providers>{children}</Providers>
				<Toaster />
			</body>
		</html>
	);
}
