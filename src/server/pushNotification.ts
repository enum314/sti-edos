import webPush from 'web-push';

import { env } from '../env/server';
import { prisma } from '../utils/prisma';
import { websocket } from './common/websocket';

webPush.setVapidDetails(
	`mailto:${env.WEB_PUSH_EMAIL}`,
	env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY,
	env.WEB_PUSH_PRIVATE_KEY,
);

export async function pushNotification(
	emails: string[] | '@everyone',
	title: string,
	message: string,
	path: string,
) {
	const users =
		emails === '@everyone'
			? await prisma.user.findMany({
					select: {
						id: true,
						subscriptions: true,
					},
			  })
			: await prisma.user.findMany({
					where: {
						email: {
							in: emails,
						},
					},
					select: {
						id: true,
						subscriptions: true,
					},
			  });

	const payload = {
		title,
		message,
		path,
	};

	for (const user of users) {
		const notification = await prisma.notification.create({
			data: {
				userId: user.id,
				...payload,
				read: false,
			},
		});

		websocket.emit('notification', {
			id: notification.id,
			receiverId: user.id,
			...payload,
		});

		for (const subscription of user.subscriptions) {
			try {
				await webPush.sendNotification(
					{
						...subscription,
						keys: subscription.keys as webPush.PushSubscription['keys'],
					},
					JSON.stringify(payload),
				);
			} catch (err) {
				//
			}
		}
	}
}
