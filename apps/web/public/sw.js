const CACHE_NAME = "oikentra-shell-v1";
const APP_SHELL = ["/", "/offline", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			for (const asset of APP_SHELL) {
				try {
					await cache.add(asset);
				} catch {
					// A single unavailable asset must not block PWA installation.
				}
			}
		}),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) =>
				Promise.all(
					cacheNames
						.filter((cacheName) => cacheName !== CACHE_NAME)
						.map((cacheName) => caches.delete(cacheName)),
				),
			),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	let url;

	try {
		url = new URL(request.url);
	} catch {
		return;
	}

	if (request.method !== "GET" || url.origin !== self.location.origin) {
		return;
	}

	if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
		return;
	}

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(async () => {
				const cachedPage = await caches.match(request);
				return cachedPage || caches.match("/offline");
			}),
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			if (cachedResponse) {
				return cachedResponse;
			}

			return fetch(request).then((response) => {
				if (!response.ok) {
					return response;
				}

				const responseToCache = response.clone();
				void caches.open(CACHE_NAME).then((cache) => {
					void cache.put(request, responseToCache);
				});
				return response;
			});
		}),
	);
});
