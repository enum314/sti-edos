import { z } from 'zod';

import { Permission } from '../../utils/Constants';
import { rateLimit } from '../middlewares/rateLimit';
import { restrict } from '../middlewares/restrict';
import { pushNotification } from '../pushNotification';
import { onlineUsers } from '../stores';
import { authProcedure, router } from '../trpc';
import { announcementPanelRouter } from './panel/announcement';
import { permitsRouter } from './panel/permits';
import { violationsRouter } from './panel/violations';

export const panelRouter = router({
	users: authProcedure
		.use(
			restrict({
				or: [
					Permission.PANEL_VIOLATION_MANAGE,
					Permission.PANEL_PERMIT_MANAGE,
				],
			}),
		)
		.input(
			z
				.object({
					query: z.string().optional(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const { query } = input;

			const data = await ctx.prisma.user.findMany({
				where: query
					? {
							OR: [
								{
									name: {
										contains: query,
									},
								},
								{
									email: {
										contains: query,
									},
								},
							],
					  }
					: undefined,
				select: {
					name: true,
					email: true,
				},
				orderBy: {
					name: 'asc',
				},
				skip: 0,
				take: 5,
			});

			return [...Array.from(onlineUsers.values()), ...data].filter(
				(item, index, self) => {
					return (
						self.findIndex((i) => i.email === item.email) === index
					);
				},
			);
		}),
	notify: authProcedure
		.input(
			z
				.object({
					id: z.string(),
				})
				.strict(),
		)
		.use(rateLimit('user.notify', { points: 1, duration: 10 }))
		.use(
			restrict({
				or: [Permission.PANEL_USER_PROFILES_VIEW],
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.prisma.user.findUnique({
				where: {
					id: input.id,
				},
				select: {
					name: true,
					email: true,
				},
			});

			if (user && user.name && user.email) {
				await pushNotification(
					[user.email],
					'You have a new notification!',
					'The Disciplinary Office requires your presence!',
					'/notifications',
				);
			}
		}),
	violations: violationsRouter,
	permits: permitsRouter,
	announcement: announcementPanelRouter,
});
