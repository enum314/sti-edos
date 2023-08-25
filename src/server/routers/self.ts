import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import { env } from '../../env/server';
import { ArrayShuffle } from '../../utils/ArrayShuffle';
import { websocket, WebSocketEvents } from '../common/websocket';
import { rateLimit } from '../middlewares/rateLimit';
import { onlineUsers } from '../stores';
import { authProcedure, router } from '../trpc';

const MAX_FILE_SIZE = 20000000;

const ACCEPTED_IMAGE_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
	'application/pdf',
];

export const selfRouter = router({
	stats: authProcedure.query(async ({ ctx }) => {
		const today = new Date().toISOString().slice(0, 10);

		const existing = await ctx.prisma.onlineSession.findFirst({
			where: {
				userId: ctx.session.user.id,
				createdAt: {
					gte: new Date(today),
					lt: new Date(
						new Date(today).getTime() + 24 * 60 * 60 * 1000,
					),
				},
			},
		});

		if (!existing) {
			await ctx.prisma.onlineSession.create({
				data: {
					userId: ctx.session.user.id,
				},
			});
		}

		const totalViolations = await ctx.prisma.violation.count({
			where: {
				violators: {
					has: ctx.session.user.email,
				},
			},
		});

		const minorViolations = await ctx.prisma.violation.count({
			where: {
				violators: {
					has: ctx.session.user.email,
				},
				level: 'MINOR',
			},
		});

		const majorAViolations = await ctx.prisma.violation.count({
			where: {
				violators: {
					has: ctx.session.user.email,
				},
				level: 'MAJOR_A',
			},
		});

		const majorBViolations = await ctx.prisma.violation.count({
			where: {
				violators: {
					has: ctx.session.user.email,
				},
				level: 'MAJOR_B',
			},
		});

		const majorCViolations = await ctx.prisma.violation.count({
			where: {
				violators: {
					has: ctx.session.user.email,
				},
				level: 'MAJOR_C',
			},
		});

		const majorDViolations = await ctx.prisma.violation.count({
			where: {
				violators: {
					has: ctx.session.user.email,
				},
				level: 'MAJOR_D',
			},
		});

		const activePermits = await ctx.prisma.permit.count({
			where: {
				authorId: ctx.session.user.id,
				pending: false,
				approval: {
					expireAt: {
						gt: new Date(),
					},
				},
				rejection: null,
				revocation: null,
			},
		});

		const pendingPermits = await ctx.prisma.permit.count({
			where: {
				authorId: ctx.session.user.id,
				pending: true,
			},
		});

		const rejectedPermits = await ctx.prisma.permit.count({
			where: {
				authorId: ctx.session.user.id,
				pending: false,
				approval: null,
				rejection: {},
			},
		});

		const notifications = await ctx.prisma.notification.count({
			where: {
				userId: ctx.session.user.id,
				read: false,
			},
		});

		return {
			violations: {
				total: totalViolations,
				minor: minorViolations,
				majorA: majorAViolations,
				majorB: majorBViolations,
				majorC: majorCViolations,
				majorD: majorDViolations,
			},
			activePermits,
			pendingPermits,
			rejectedPermits,
			notifications,
		};
	}),
	role: authProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findUnique({
			select: {
				role: true,
			},
			where: {
				id: ctx.session.user.id,
			},
		});

		if (user?.role) {
			return user.role;
		}

		return null;
	}),
	violations: authProcedure
		.input(
			z
				.object({
					page: z.number().positive(),
					MAX_LIMIT: z.number().positive(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const { page, MAX_LIMIT } = input;

			const skip = page * MAX_LIMIT - MAX_LIMIT;
			const take = MAX_LIMIT;

			const count = await ctx.prisma.violation.count({
				where: {
					violators: {
						has: ctx.session.user.email,
					},
				},
			});

			const data = await ctx.prisma.violation.findMany({
				where: {
					violators: {
						has: ctx.session.user.email,
					},
				},
				select: {
					id: true,
					name: true,
					level: true,
					violators: true,
					issuer: {
						select: {
							name: true,
							email: true,
						},
					},
					createdAt: true,
					updatedAt: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take,
			});

			return {
				data,
				count,
			};
		}),
	permits: authProcedure
		.input(
			z.object({
				page: z.number().positive(),
				MAX_LIMIT: z.number().positive(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { page, MAX_LIMIT } = input;

			const skip = page * MAX_LIMIT - MAX_LIMIT;
			const take = MAX_LIMIT;

			const count = await ctx.prisma.permit.count({
				where: {
					authorId: ctx.session.user.id,
				},
			});

			const data = await ctx.prisma.permit.findMany({
				where: {
					authorId: ctx.session.user.id,
				},
				select: {
					id: true,
					name: true,
					author: {
						select: {
							name: true,
							email: true,
						},
					},
					pending: true,
					approval: {
						select: {
							author: {
								select: {
									name: true,
									email: true,
								},
							},
							createdAt: true,
							expireAt: true,
						},
					},
					rejection: {
						select: {
							author: {
								select: {
									name: true,
									email: true,
								},
							},
							createdAt: true,
						},
					},
					revocation: {
						select: {
							author: {
								select: {
									name: true,
									email: true,
								},
							},
							createdAt: true,
						},
					},
					createdAt: true,
					updatedAt: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take,
			});

			return {
				data,
				count,
			};
		}),
	userById: authProcedure
		.input(
			z
				.object({
					id: z.string().cuid(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const user = await ctx.prisma.user.findUnique({
				where: {
					id: input.id,
				},
				select: {
					name: true,
					email: true,
				},
			});

			return user;
		}),
	userByEmail: authProcedure
		.input(
			z
				.object({
					email: z.string().email(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const user = await ctx.prisma.user.findUnique({
				where: {
					email: input.email,
				},
				select: {
					name: true,
					email: true,
				},
			});

			return user;
		}),
	pushNotification: authProcedure
		.input(
			z
				.object({
					subscription: z
						.object({
							endpoint: z.string(),
							keys: z
								.object({
									auth: z.string(),
									p256dh: z.string(),
								})
								.strict(),
							expiration: z.string().optional(),
						})
						.strict(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { subscription } = input;

			const existingSubscription =
				await ctx.prisma.pushSubscription.findUnique({
					where: { endpoint: subscription.endpoint },
				});

			if (existingSubscription) {
				await ctx.prisma.pushSubscription.update({
					where: { id: existingSubscription.id },
					data: {
						userId: ctx.session.user.id,
						keys: subscription.keys,
						expiration: subscription.expiration,
					},
				});
			} else {
				await ctx.prisma.pushSubscription.create({
					data: {
						userId: ctx.session.user.id,
						endpoint: subscription.endpoint,
						keys: subscription.keys,
						expiration: subscription.expiration,
					},
				});
			}

			return { success: true };
		}),
	upload: authProcedure
		.use(rateLimit('self.upload', { points: 1, duration: 3 }))
		.input(
			z
				.object({
					fileName: z.string(),
					type: z
						.string()
						.refine(
							(v) => ACCEPTED_IMAGE_TYPES.includes(v),
							'Only .jpg, .jpeg, .png, .webp and .pdf files are accepted.',
						),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const instance = await ctx.prisma.file.create({
				data: {
					fileName: input.fileName,
					userId: ctx.session.user.id,
				},
			});

			const updated_instance = await ctx.prisma.file.update({
				where: {
					id: instance.id,
				},
				data: {
					Key: `${ctx.session.user.id}/${instance.id}/${input.fileName}`,
				},
			});

			const signed = ctx.storage.createPresignedPost({
				Fields: {
					Key: updated_instance.Key,
				},
				Bucket: env.STORAGE_BUCKET,
				Conditions: [['content-length-range', 0, MAX_FILE_SIZE]],
				Expires: 30,
			});

			return {
				id: updated_instance.id,
				signed,
				key: updated_instance.Key as string,
			};
		}),
	notifications: authProcedure
		.input(
			z
				.object({
					page: z.number().positive(),
					MAX_LIMIT: z.number().positive(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const { page, MAX_LIMIT } = input;

			const skip = page * MAX_LIMIT - MAX_LIMIT;
			const take = MAX_LIMIT;

			const count = await ctx.prisma.notification.count({
				where: {
					userId: ctx.session.user.id,
				},
			});

			const list = await ctx.prisma.notification.findMany({
				where: {
					userId: ctx.session.user.id,
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take,
			});

			return {
				list,
				count,
			};
		}),
	onlineUsers: authProcedure.query(async () => {
		return ArrayShuffle(Array.from(onlineUsers.values()));
	}),
	notifier: authProcedure.subscription(({ ctx }) => {
		return observable<WebSocketEvents['notification'][0]>((observer) => {
			const listener = (data: WebSocketEvents['notification'][0]) => {
				if (data.receiverId === ctx.session.user.id) {
					observer.next(data);
				}
			};

			websocket.on('notification', listener);

			return () => {
				websocket.off('notification', listener);
				onlineUsers.delete(ctx.session.user.id);
			};
		});
	}),
	markAsReadNotification: authProcedure
		.input(
			z
				.object({
					id: z.string().cuid().array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.notification.updateMany({
				where: {
					id: {
						in: input.id,
					},
				},
				data: {
					read: true,
				},
			});
		}),
	markAsUnreadNotification: authProcedure
		.input(
			z
				.object({
					id: z.string().cuid().array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.notification.updateMany({
				where: {
					id: {
						in: input.id,
					},
				},
				data: {
					read: false,
				},
			});
		}),
	deleteNotification: authProcedure
		.input(
			z
				.object({
					id: z.string().cuid().array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.notification.deleteMany({
				where: {
					id: {
						in: input.id,
					},
				},
			});
		}),
});
