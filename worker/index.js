'use strict';

self.addEventListener('push', function (event) {
	const data = JSON.parse(event.data.text());

	event.waitUntil(
		// eslint-disable-next-line no-undef
		clients.matchAll({ type: 'window' }).then((clientsArr) => {
			const hadWindowToFocus = clientsArr.some((windowClient) =>
				windowClient.url === event.notification.data.url
					? (windowClient.focus(), true)
					: false,
			);

			if (!hadWindowToFocus) {
				self.registration.showNotification(data.title, {
					body: data.message,
					icon: '/icon-192x192.png',
					data: {
						url: `${self.location.origin}${data.path}`,
					},
				});
			}
		}),
	);
});

self.addEventListener('notificationclick', function (event) {
	event.notification.close();

	event.waitUntil(
		// eslint-disable-next-line no-undef
		clients.matchAll({ type: 'window' }).then((clientsArr) => {
			const hadWindowToFocus = clientsArr.some((windowClient) =>
				windowClient.url === event.notification.data.url
					? (windowClient.focus(), true)
					: false,
			);
			if (!hadWindowToFocus) {
				// eslint-disable-next-line no-undef
				clients
					.openWindow(event.notification.data.url)
					.then((windowClient) =>
						windowClient ? windowClient.focus() : null,
					);
			}
		}),
	);
});

self.addEventListener('pushsubscriptionchange', function (event) {
	const payload = {
		old_endpoint: event.oldSubscription
			? event.oldSubscription.endpoint
			: null,
		new_endpoint: event.newSubscription
			? event.newSubscription.endpoint
			: null,
		new_p256dh: event.newSubscription
			? event.newSubscription.toJSON().keys.p256dh
			: null,
		new_auth: event.newSubscription
			? event.newSubscription.toJSON().keys.auth
			: null,
		new_expiration: event.newSubscription
			? event.newSubscription.toJSON().expirationTime.toString()
			: null,
	};

	event.waitUntil(
		fetch('/api/pubsub', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
		}),
	);
});
