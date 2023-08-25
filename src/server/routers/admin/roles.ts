import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { Permission } from '../../../utils/Constants';
import { rateLimit } from '../../middlewares/rateLimit';
import { adminProcedure, router } from '../../trpc';

export const rolesRouter = router({
	list: adminProcedure.query(async ({ ctx }) => {
		const data = await ctx.prisma.role.findMany({
			select: {
				id: true,
				name: true,
				color: true,
				permissions: true,
				users: {
					select: {
						name: true,
					},
				},
			},
			orderBy: {
				id: 'asc',
			},
		});

		return data;
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
			const role = await ctx.prisma.role.findUnique({
				where: input,
			});

			if (!role) {
				throw new TRPCError({ code: 'NOT_FOUND' });
			}

			return role;
		}),
	getUserCount: adminProcedure
		.input(
			z
				.object({
					id: z.string().cuid(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const count = await ctx.prisma.user.count({
				where: {
					roleId: input.id,
				},
			});

			return count;
		}),
	create: adminProcedure
		.use(rateLimit('admin.roles.create', { points: 1, duration: 15 }))
		.input(
			z
				.object({
					name: z.string().min(3).max(16),
					color: z.string().min(4).max(9).regex(/^#/),
					permissions: z.nativeEnum(Permission).array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const role = await ctx.prisma.role.create({
				data: {
					...input,
					name: input.name.trim(),
				},
			});

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'role.create',
					path: `/admin/roles/${role.id}`,
					message: `Created role ${role.id}`,
				},
			});

			return role.id;
		}),
	edit: adminProcedure
		.use(rateLimit('admin.roles.edit', { points: 3, duration: 15 }))
		.input(
			z
				.object({
					id: z.string().cuid(),
					data: z
						.object({
							name: z.string().min(3).max(16),
							color: z.string().min(4).max(9).regex(/^#/),
							permissions: z.nativeEnum(Permission).array(),
						})
						.strict(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.role.update({
				where: {
					id: input.id,
				},
				data: {
					...input.data,
					name: input.data.name.trim(),
				},
			});

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'role.edit',
					path: `/admin/roles/${input.id}`,
					message: `Edited role ${input.id}`,
				},
			});
		}),
	delete: adminProcedure
		.use(rateLimit('admin.roles.delete', { points: 1, duration: 30 }))
		.input(
			z
				.object({
					id: z.string().cuid(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.role.delete({
				where: input,
			});

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'role.delete',
					path: `/admin/roles/${input.id}`,
					message: `Deleted role ${input.id}`,
				},
			});
		}),
});
