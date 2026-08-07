import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Oikentra",
		short_name: "Oikentra",
		description: "Control simple de caja y fiados para pequeños negocios.",
		start_url: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#d4f5e5",
		lang: "es",
		icons: [
			{
				src: "/icons/icon.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "any",
			},
		],
	};
}
