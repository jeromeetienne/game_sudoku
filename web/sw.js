/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope & typeof globalThis} */
const sw = /** @type {any} */ (self);

const CACHE_VERSION = 'sudoku-v9';

const PRECACHE_URLS = [
	'./',
	'./index.html',
	'./css/styles.css',
	'./manifest.webmanifest',
	'./js/main.js',
	'./js/sudoku-app.js',
	'./js/game-state.js',
	'./js/sudoku-generator.js',
	'./images/icons/icon.svg',
	'./images/icons/icon-192.png',
	'./images/icons/icon-512.png',
	'./images/icons/apple-touch-icon.png',
	'./images/icons/favicon.ico',
	'./images/icons/favicon-16.png',
	'./images/icons/favicon-32.png',
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

sw.addEventListener('message', (event) => {
	if (event.data === 'GET_VERSION' && event.ports[0] !== undefined) {
		event.ports[0].postMessage(CACHE_VERSION);
	}
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
