import { z } from 'zod';

import { rateLimit } from '../../middlewares/rateLimit';
import { adminProcedure, router } from '../../trpc';

const MAX_LIMIT = 10;

export const usersRouter = router({
	list: adminProcedure
		.input(
			z
				.object({
					page: z.number().positive(),
					filter: z.enum(['all', 'user', 'admin']),
					query: z.string().optional(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const { page, query, filter } = {
				...input,
				query: input.query?.replace(/(\(|\))/g, '') ?? '',
			};

			const skip = page * MAX_LIMIT - MAX_LIMIT;
			const take = MAX_LIMIT;

			if (filter === 'admin') {
				const count = await ctx.prisma.user.count({
					where: {
						isAdmin: true,
						name: query
							? {
									contains: query,
									mode: 'insensitive',
							  }
							: undefined,
					},
				});

				const data = await ctx.prisma.user.findMany({
					where: {
						isAdmin: true,
						name: query
							? {
									contains: query,
									mode: 'insensitive',
							  }
							: undefined,
					},
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						isAdmin: true,
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
			}

			if (filter === 'user') {
				const count = await ctx.prisma.user.count({
					where: {
						isAdmin: false,
						name: query
							? {
									contains: query,
									mode: 'insensitive',
							  }
							: undefined,
					},
				});

				const data = await ctx.prisma.user.findMany({
					where: {
						isAdmin: false,
						name: query
							? {
									contains: query,
									mode: 'insensitive',
							  }
							: undefined,
					},
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						isAdmin: true,
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
			}

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
					role: true,
					isAdmin: true,
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
	get: adminProcedure
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
					id: true,
					name: true,
					email: true,
					isAdmin: true,
					role: true,
					roleId: true,
				},
			});

			if (!user) return null;

			const violations = await ctx.prisma.violation.count({
				where: {
					violators: {
						has: user.email,
					},
				},
			});

			const activePermits = await ctx.prisma.permit.count({
				where: {
					authorId: user.id,
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
					authorId: user.id,
					pending: true,
				},
			});

			return { ...user, violations, activePermits, pendingPermits };
		}),
	editUser: adminProcedure
		.use(
			rateLimit('admin.users.editUser', {
				points: 5,
				duration: 25,
			}),
		)
		.input(
			z
				.object({
					id: z.string().cuid(),
					isAdmin: z.boolean(),
					roleId: z.string().nullable(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const oldUser = await ctx.prisma.user.findUnique({
				where: {
					id: input.id,
				},
				select: {
					isAdmin: true,
					roleId: true,
				},
			});

			const newUser = await ctx.prisma.user.update({
				where: {
					id: input.id,
				},
				data: {
					isAdmin: input.isAdmin,
					roleId: input.roleId,
				},
			});

			if (oldUser?.isAdmin !== newUser.isAdmin) {
				await ctx.prisma.webAction.create({
					data: {
						userId: ctx.session.user.id,
						action: 'user.edit',
						path: `/admin/users/${newUser.id}`,
						message: `Changed user ${newUser.name} (${newUser.id}) admin status to ${newUser.isAdmin}`,
					},
				});
			}

			if (!oldUser?.roleId && newUser.roleId) {
				await ctx.prisma.webAction.create({
					data: {
						userId: ctx.session.user.id,
						action: 'user.edit',
						path: `/admin/users/${newUser.id}`,
						message: `Added user ${newUser.name} (${newUser.id}) role ${newUser.roleId}`,
					},
				});
			} else if (oldUser?.roleId && !newUser.roleId) {
				await ctx.prisma.webAction.create({
					data: {
						userId: ctx.session.user.id,
						action: 'user.edit',
						path: `/admin/users/${newUser.id}`,
						message: `Removed user ${newUser.name} (${newUser.id}) role`,
					},
				});
			} else if (oldUser?.roleId !== newUser.roleId) {
				await ctx.prisma.webAction.create({
					data: {
						userId: ctx.session.user.id,
						action: 'user.edit',
						path: `/admin/users/${newUser.id}`,
						message: `Changed user ${newUser.name} (${newUser.id}) role to ${newUser.roleId}`,
					},
				});
			}
		}),
});
