const CACHE_VERSION = 'sudoku-v2';

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

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_VERSION)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
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
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method !== 'GET') {
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(() =>
				caches.match('./index.html').then((cached) => {
					if (cached !== undefined) {
						return cached;
					}
					return caches.match('./');
				}),
			),
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached !== undefined) {
				return cached;
			}
			return fetch(request).then((response) => {
				if (
					response.ok === true &&
					(request.url.startsWith(self.location.origin) ||
						request.url.includes('fonts.g'))
				) {
					const copy = response.clone();
					caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
				}
				return response;
			});
		}),
	);
});
