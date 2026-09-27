import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	experimental: {
		turbopackFileSystemCacheForBuild: true,
	},
	async redirects() {
		return [
			{ source: "/registro", destination: "/register", permanent: false },
			{
				source: "/recuperar-contrasena",
				destination: "/forgot-password",
				permanent: false,
			},
			{
				source: "/restablecer-contrasena",
				destination: "/reset-password",
				permanent: false,
			},
			{
				source: "/verificar-correo",
				destination: "/verify-email",
				permanent: false,
			},
		];
	},
	async headers() {
		return [
			{
				source: "/verify-email",
				headers: [
					{ key: "Cache-Control", value: "no-store" },
					{ key: "Referrer-Policy", value: "no-referrer" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Robots-Tag", value: "noindex, nofollow" },
				],
			},
			{
				source: "/reset-password",
				headers: [
					{ key: "Cache-Control", value: "no-store" },
					{ key: "Referrer-Policy", value: "no-referrer" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Robots-Tag", value: "noindex, nofollow" },
				],
			},
		];
	},
};

export default nextConfig;
