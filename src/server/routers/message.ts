import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import { Permission } from '../../utils/Constants';
import { websocket, WebSocketEvents } from '../common/websocket';
import { rateLimit } from '../middlewares/rateLimit';
import { restrict } from '../middlewares/restrict';
import { pushNotification } from '../pushNotification';
import { authProcedure, router } from '../trpc';

export const messageRouter = router({
	violationMessages: authProcedure
		.input(
			z
				.object({
					violationId: z.number(),
				})
				.strict(),
		)
		.use(
			restrict<{ violationId: number }>(
				{
					or: [Permission.PANEL_VIOLATION_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const violation = await ctx.prisma.violation.findUnique(
							{
								where: {
									id: input.violationId,
								},
								select: {
									violators: true,
								},
							},
						);

						return (
							violation?.violators.includes(
								ctx.session.user?.email as string,
							) ?? false
						);
					}

					return false;
				},
			),
		)
		.query(async ({ ctx, input }) => {
			const rawMessages = await ctx.prisma.violationMessage.findMany({
				where: {
					violationId: input.violationId,
				},
				select: {
					id: true,
					violationId: true,
					message: true,
					author: {
						select: {
							name: true,
						},
					},
					createdAt: true,
				},
			});

			await ctx.prisma.notification.updateMany({
				where: {
					userId: ctx.session.user.id,
					path: `/violation/${input.violationId}`,
					read: false,
				},
				data: {
					read: true,
				},
			});

			const messages: WebSocketEvents['violationMessage'][0][] =
				rawMessages.map((x) => ({
					id: x.id,
					type: 'message',
					violationId: x.violationId,
					author: x.author.name as string,
					content: x.message,
					createdAt: x.createdAt,
				}));

			return messages;
		}),
	violationMessageSender: authProcedure
		.use(rateLimit('violation.message', { points: 3, duration: 10 }))
		.input(
			z
				.object({
					violationId: z.number(),
					content: z.string().min(1).max(100),
				})
				.strict(),
		)
		.use(
			restrict<{ violationId: number }>(
				{
					or: [Permission.PANEL_VIOLATION_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const violation = await ctx.prisma.violation.findUnique(
							{
								where: {
									id: input.violationId,
								},
								select: {
									violators: true,
								},
							},
						);

						return (
							violation?.violators.includes(
								ctx.session.user?.email as string,
							) ?? false
						);
					}

					return false;
				},
			),
		)
		.mutation(async ({ ctx, input }) => {
			const content = input.content.trim();

			const violationMessage = await ctx.prisma.violationMessage.create({
				data: {
					violationId: input.violationId,
					authorId: ctx.session.user.id,
					message: content,
				},
			});

			websocket.emit('violationMessage', {
				id: violationMessage.id,
				type: 'message',
				violationId: violationMessage.violationId,
				author: ctx.session.user.name as string,
				content: violationMessage.message,
				createdAt: violationMessage.createdAt,
			});

			const violation = await ctx.prisma.violation.findUnique({
				where: {
					id: input.violationId,
				},
				select: {
					id: true,
					violators: true,
				},
			});

			if (violation) {
				await pushNotification(
					violation.violators
						.filter((item, index, self) => {
							return index === self.findIndex((t) => t === item);
						})
						.filter((item) => item !== ctx.session.user.email),
					`Violation #${input.violationId
						.toString()
						.padStart(5, '0')}`,
					`${ctx.session.user.name as string}: ${content}`,
					`/violation/${violation.id}`,
				);
			}
		}),
	listenViolation: authProcedure
		.input(
			z
				.object({
					violationId: z.number(),
				})
				.strict(),
		)
		.use(
			restrict<{ violationId: number }>(
				{
					or: [Permission.PANEL_VIOLATION_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const violation = await ctx.prisma.violation.findUnique(
							{
								where: {
									id: input.violationId,
								},
								select: {
									violators: true,
								},
							},
						);

						return (
							violation?.violators.includes(
								ctx.session.user?.email as string,
							) ?? false
						);
					}

					return false;
				},
			),
		)
		.subscription(({ input }) => {
			return observable<WebSocketEvents['violationMessage'][0]>(
				(observer) => {
					const listener = (
						data: WebSocketEvents['violationMessage'][0],
					) => {
						if (data.violationId === input.violationId) {
							observer.next(data);
						}
					};

					websocket.on('violationMessage', listener);

					return () => {
						websocket.off('violationMessage', listener);
					};
				},
			);
		}),
	permitMessages: authProcedure
		.input(
			z
				.object({
					permitId: z.number(),
				})
				.strict(),
		)
		.use(
			restrict<{ permitId: number }>(
				{
					or: [Permission.PANEL_PERMIT_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const permit = await ctx.prisma.permit.findUnique({
							where: {
								id: input.permitId,
							},
						});

						return permit?.authorId === ctx.session.user?.id;
					}
					return false;
				},
			),
		)
		.query(async ({ ctx, input }) => {
			const rawMessages = await ctx.prisma.permitMessage.findMany({
				where: {
					permitId: input.permitId,
				},
				select: {
					id: true,
					permitId: true,
					message: true,
					author: {
						select: {
							name: true,
						},
					},
					createdAt: true,
				},
			});

			await ctx.prisma.notification.updateMany({
				where: {
					userId: ctx.session.user.id,
					path: `/permit/${input.permitId}`,
					read: false,
				},
				data: {
					read: true,
				},
			});

			const messages: WebSocketEvents['permitMessage'][0][] =
				rawMessages.map((x) => ({
					id: x.id,
					type: 'message',
					permitId: x.permitId,
					author: x.author.name as string,
					content: x.message,
					createdAt: x.createdAt,
				}));

			return messages;
		}),
	permitMessageSender: authProcedure
		.use(rateLimit('permit.message', { points: 3, duration: 10 }))
		.input(
			z
				.object({
					permitId: z.number(),
					content: z.string().min(1).max(100),
				})
				.strict(),
		)
		.use(
			restrict<{ permitId: number }>(
				{
					or: [Permission.PANEL_PERMIT_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const permit = await ctx.prisma.permit.findUnique({
							where: {
								id: input.permitId,
							},
							select: {
								authorId: true,
							},
						});

						return permit?.authorId === ctx.session.user?.id;
					}

					return false;
				},
			),
		)
		.mutation(async ({ ctx, input }) => {
			const content = input.content.trim();

			const permitMessage = await ctx.prisma.permitMessage.create({
				data: {
					permitId: input.permitId,
					authorId: ctx.session.user.id,
					message: content,
				},
			});

			websocket.emit('permitMessage', {
				id: permitMessage.id,
				type: 'message',
				permitId: permitMessage.permitId,
				author: ctx.session.user.name as string,
				content: permitMessage.message,
				createdAt: permitMessage.createdAt,
			});

			const users = await ctx.prisma.user.findMany({
				where: {
					OR: [
						{
							isAdmin: true,
						},
						{
							role: {
								permissions: {
									hasSome: [Permission.PANEL_PERMIT_MANAGE],
								},
							},
						},
					],
				},
				select: {
					email: true,
				},
			});

			const permit = await ctx.prisma.permit.findUnique({
				where: {
					id: input.permitId,
				},
				select: {
					id: true,
				},
			});

			if (permit) {
				await pushNotification(
					[
						...(users
							.map((x) => x.email)
							.filter((x) => x) as string[]),
					]
						.filter((item, index, self) => {
							return index === self.findIndex((t) => t === item);
						})
						.filter((item) => item !== ctx.session.user.email),
					`Permit #${input.permitId.toString().padStart(5, '0')}`,
					`${ctx.session.user.name as string}: ${content}`,
					`/permit/${permit.id}`,
				);
			}
		}),
	listenPermit: authProcedure
		.input(
			z.object({
				permitId: z.number(),
			}),
		)
		.use(
			restrict<{ permitId: number }>(
				{
					or: [Permission.PANEL_PERMIT_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const permit = await ctx.prisma.permit.findUnique({
							where: {
								id: input.permitId,
							},
							select: {
								authorId: true,
							},
						});

						return permit?.authorId === ctx.session.user?.id;
					}

					return false;
				},
			),
		)
		.subscription(({ input }) => {
			return observable<WebSocketEvents['permitMessage'][0]>(
				(observer) => {
					const listener = (
						data: WebSocketEvents['permitMessage'][0],
					) => {
						if (data.permitId === input.permitId) {
							observer.next(data);
						}
					};

					websocket.on('permitMessage', listener);

					return () => {
						websocket.off('permitMessage', listener);
					};
				},
			);
		}),
});
