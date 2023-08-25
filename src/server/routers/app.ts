import { z } from 'zod';

import { Permission } from '../../utils/Constants';
import { restrict } from '../middlewares/restrict';
import { authProcedure, router } from '../trpc';
import { adminRouter } from './admin';
import { announcementRouter } from './announcement';
import { messageRouter } from './message';
import { panelRouter } from './panel';
import { selfRouter } from './self';

const MAX_LIMIT = 10;

export const appRouter = router({
	admin: adminRouter,
	self: selfRouter,
	panel: panelRouter,
	message: messageRouter,
	announcement: announcementRouter,
	profile: authProcedure
		.input(
			z
				.object({
					id: z.string(),
				})
				.strict(),
		)
		.use(
			restrict<{ id: string }>(
				{
					or: [Permission.PANEL_USER_PROFILES_VIEW],
				},
				async (ctx, { id }) => {
					return ctx.session?.user?.id === id;
				},
			),
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

			if (!user) {
				return null;
			}

			const totalViolations = await ctx.prisma.violation.count({
				where: {
					violators: {
						has: user.email,
					},
				},
			});

			const minorViolations = await ctx.prisma.violation.count({
				where: {
					violators: {
						has: user.email,
					},
					level: 'MINOR',
				},
			});

			const majorAViolations = await ctx.prisma.violation.count({
				where: {
					violators: {
						has: user.email,
					},
					level: 'MAJOR_A',
				},
			});

			const majorBViolations = await ctx.prisma.violation.count({
				where: {
					violators: {
						has: user.email,
					},
					level: 'MAJOR_B',
				},
			});

			const majorCViolations = await ctx.prisma.violation.count({
				where: {
					violators: {
						has: user.email,
					},
					level: 'MAJOR_C',
				},
			});

			const majorDViolations = await ctx.prisma.violation.count({
				where: {
					violators: {
						has: user.email,
					},
					level: 'MAJOR_D',
				},
			});

			const activePermits = await ctx.prisma.permit.count({
				where: {
					authorId: input.id,
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
					authorId: input.id,
					pending: true,
				},
			});

			const rejectedPermits = await ctx.prisma.permit.count({
				where: {
					authorId: input.id,
					pending: false,
					approval: null,
					rejection: {},
				},
			});

			const violations = await ctx.prisma.violation.findMany({
				where: {
					violators: {
						has: user.email,
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
			});

			const permits = await ctx.prisma.permit.findMany({
				where: {
					authorId: input.id,
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
			});

			return {
				user,
				count: {
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
				},
				violations,
				permits,
			};
		}),
	profiles: authProcedure
		.input(
			z
				.object({
					page: z.number().positive(),
					query: z.string().optional(),
				})
				.strict(),
		)
		.use(
			restrict({
				or: [Permission.PANEL_USER_PROFILES_VIEW],
			}),
		)
		.query(async ({ ctx, input }) => {
			const { page, query } = {
				...input,
				query: input.query?.replace(/(\(|\))/g, '') ?? '',
			};

			const skip = page * MAX_LIMIT - MAX_LIMIT;
			const take = MAX_LIMIT;

			const count = await ctx.prisma.user.count({
				where: query
					? {
							name: {
								contains: query,
								mode: 'insensitive',
							},
					  }
					: undefined,
			});

			const data = await ctx.prisma.user.findMany({
				where: query
					? {
							name: {
								contains: query,
								mode: 'insensitive',
							},
					  }
					: undefined,
				select: {
					id: true,
					name: true,
					email: true,
				},
				orderBy: {
					name: 'asc',
				},
				skip,
				take,
			});

			return {
				data,
				pages: Math.ceil(count / MAX_LIMIT),
				count,
			};
		}),
});

export type AppRouter = typeof appRouter;
