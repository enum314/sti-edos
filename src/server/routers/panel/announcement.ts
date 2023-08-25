import { z } from 'zod';

import { Permission } from '../../../utils/Constants';
import { rateLimit } from '../../middlewares/rateLimit';
import { restrict } from '../../middlewares/restrict';
import { pushNotification } from '../../pushNotification';
import { authProcedure, router } from '../../trpc';

export const announcementPanelRouter = router({
	create: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_ANNOUNCEMENT_MANAGE],
			}),
		)
		.use(
			rateLimit('panel.announcement.create', { points: 1, duration: 60 }),
		)
		.input(
			z
				.object({
					title: z.string().min(1).max(128),
					message: z.string().min(1).max(8192),
					attachments: z.string().cuid().array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { title, message, attachments } = input;

			const announcement = await ctx.prisma.announcement.create({
				data: {
					title: title.trim(),
					message: message.trim(),
					attachments: attachments.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					}),
					authorId: ctx.session.user.id,
				},
			});

			await pushNotification(
				'@everyone',
				`Announcement!`,
				title,
				`/announcement/${announcement.id}`,
			);

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'announcement.create',
					path: `/announcement/${announcement.id}`,
					message: `Created announcement ${announcement.id}`,
				},
			});

			return announcement.id;
		}),
	edit: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_ANNOUNCEMENT_MANAGE],
			}),
		)
		.use(rateLimit('panel.announcement.edit', { points: 1, duration: 60 }))
		.input(
			z
				.object({
					id: z.string().cuid(),
					title: z.string().min(1).max(128),
					message: z.string().min(1).max(8192),
					attachments: z.string().cuid().array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, title, message, attachments } = input;

			const announcement = await ctx.prisma.announcement.update({
				where: {
					id,
				},
				data: {
					title,
					message,
					attachments: attachments.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					}),
				},
			});

			await pushNotification(
				'@everyone',
				`Announcement!`,
				title,
				`/announcement/${announcement.id}`,
			);

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'announcement.edit',
					path: `/announcement/${announcement.id}`,
					message: `Edited announcement ${announcement.id}`,
				},
			});

			return announcement.id;
		}),
	delete: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_ANNOUNCEMENT_MANAGE],
			}),
		)
		.use(
			rateLimit('panel.announcement.delete', { points: 1, duration: 60 }),
		)
		.input(
			z
				.object({
					id: z.string().cuid(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id } = input;

			await ctx.prisma.announcement.delete({
				where: {
					id,
				},
			});

			await ctx.prisma.notification.deleteMany({
				where: {
					path: `/announcement/${id}`,
				},
			});

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'announcement.delete',
					path: `/announcement/${id}`,
					message: `Deleted announcement ${id}`,
				},
			});

			return id;
		}),
});
