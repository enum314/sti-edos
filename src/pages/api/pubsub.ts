import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerAuthSession } from '../../server/common/getServerAuthSession';
import { prisma } from '../../utils/prisma';

const validator = z
	.object({
		old_endpoint: z.string().url().nullable(),
		new_endpoint: z.string().url().nullable(),
		new_p256dh: z.string().nullable(),
		new_auth: z.string().nullable(),
		new_expiration: z.string().nullable(),
	})
	.strict();

export default async function PubSub(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method Not Allowed' });
	}

	const payload = validator.safeParse(req.body);

	if (payload.success) {
		const { data } = payload;

		if (data.old_endpoint) {
			await prisma.pushSubscription.delete({
				where: {
					endpoint: data.old_endpoint,
				},
			});
		}

		if (data.new_endpoint) {
			const session = await getServerAuthSession({ req, res });

			if (!session?.user) {
				return res.status(401).json({ message: 'Forbidden' });
			}

			try {
				await prisma.pushSubscription.create({
					data: {
						userId: session.user.id,
						endpoint: data.new_endpoint,
						expiration: data.new_expiration ?? undefined,
						keys: {
							auth: data.new_auth,
							p256dh: data.new_p256dh,
						},
					},
				});
			} catch (err) {
				console.error(err);
			}
		}

		return res.status(200);
	}

	console.error(payload.error);

	return res.status(400).json(payload.error);
}
