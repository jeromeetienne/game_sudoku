/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope & typeof globalThis} */
const sw = /** @type {any} */ (self);

const CACHE_VERSION = 'sudoku-v3';

const PRECACHE_URLS = [
	'./',
	'./index.html',
	'./styles.css',
	'./manifest.webmanifest',
	'./dist/main.js',
	'./dist/sudoku-app.js',
	'./dist/game-state.js',
	'./dist/sudoku-generator.js',
	'./icons/icon.svg',
	'./icons/icon-192.png',
	'./icons/icon-512.png',
	'./icons/apple-touch-icon.png',
	'./icons/favicon.ico',
	'./icons/favicon-16.png',
	'./icons/favicon-32.png',
];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_VERSION)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => sw.skipWaiting()),
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_VERSION)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => sw.clients.claim()),
	);
});

sw.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method !== 'GET') {
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(async () => {
				const cachedIndex = await caches.match('./index.html');
				if (cachedIndex !== undefined) {
					return cachedIndex;
				}

				const cachedRoot = await caches.match('./');
				if (cachedRoot !== undefined) {
					return cachedRoot;
				}

				return new Response('Offline', {
					status: 503,
					statusText: 'Service Unavailable',
					headers: {
						'Content-Type': 'text/plain',
					},
				});
			}),
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cached) => {
			const networkFetch = fetch(request).then((response) => {
				if (
					response.ok === true &&
					(request.url.startsWith(sw.location.origin) ||
						request.url.includes('fonts.g'))
				) {
					const copy = response.clone();
					caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
				}
				return response;
			});

			if (cached !== undefined) {
				networkFetch.catch(() => undefined);
				return cached;
			}
			return networkFetch;
		}),
	);
});
