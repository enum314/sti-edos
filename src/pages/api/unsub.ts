import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { prisma } from '../../utils/prisma';

const validator = z
	.object({
		endpoint: z.string().url(),
	})
	.strict();

export default async function UnSub(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method Not Allowed' });
	}

	const payload = validator.safeParse(req.body);

	if (payload.success) {
		const { data } = payload;

		if (data.endpoint) {
			await prisma.pushSubscription.delete({
				where: {
					endpoint: data.endpoint,
				},
			});
		}

		return res.status(200);
	}

	console.error(payload.error);

	return res.status(400).json(payload.error);
}
