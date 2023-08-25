import { useEffect } from 'react';

import { env } from '../env/client';
import { base64ToUint8Array } from '../utils/base64ToUint8Array';
import { trpc } from '../utils/trpc';
import { HandleTRPCError } from './common/HandleTRPCError';

export function PushNotification() {
	const mutation = trpc.self.pushNotification.useMutation({
		onError: HandleTRPCError(),
	});

	useEffect(() => {
		if (
			typeof window !== 'undefined' &&
			'Notification' in window &&
			'serviceWorker' in navigator &&
			'PushManager' in window
		) {
			Notification.requestPermission().then((permission) => {
				if (permission !== 'granted') {
					console.warn(
						'Permission to show notifications was not granted.',
					);
					alert(
						'Please allow notifications to receive push notifications.',
					);
					return;
				}

				navigator.serviceWorker.ready.then(async (registration) => {
					const sub =
						await registration.pushManager.getSubscription();

					if (
						sub &&
						!(
							sub.expirationTime &&
							Date.now() > sub.expirationTime - 5 * 60 * 1000
						)
					) {
						const { keys } = sub.toJSON() as {
							keys: { auth: string; p256dh: string };
						};

						const payload = {
							endpoint: sub.endpoint,
							expiration:
								sub.expirationTime?.toString() as string,
							keys: { auth: keys.auth, p256dh: keys.p256dh },
						};

						mutation.mutate({
							subscription: payload,
						});
					} else {
						registration.pushManager
							.subscribe({
								userVisibleOnly: true,
								applicationServerKey: base64ToUint8Array(
									env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY,
								),
							})
							.then((sub) => {
								const { keys } = sub.toJSON() as {
									keys: { auth: string; p256dh: string };
								};

								const payload = {
									endpoint: sub.endpoint,
									expiration:
										sub.expirationTime?.toString() as string,
									keys: {
										auth: keys.auth,
										p256dh: keys.p256dh,
									},
								};

								mutation.mutate({
									subscription: payload,
								});
							})
							.catch(console.error);
					}
				});
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return null;
}
