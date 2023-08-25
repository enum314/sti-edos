import { readFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';

import { adminProcedure, router } from '../trpc';
import { rolesRouter } from './admin/roles';
import { usersRouter } from './admin/users';

const packageJson = JSON.parse(
	readFileSync(path.join(process.cwd(), 'package.json')).toString(),
) as { version: string };

const MAX_LIMIT = 10;

export const adminRouter = router({
	application: adminProcedure.query(async ({ ctx }) => {
		const violations = await ctx.prisma.violation.count();
		const permits = await ctx.prisma.permit.count();
		const users = await ctx.prisma.user.count();
		const roles = await ctx.prisma.role.count();

		return {
			version: packageJson.version,
			runtime: {
				name: 'Node.js',
				version: process.version,
				platform: process.platform,
				arch: process.arch,
			},
			violations,
			permits,
			users,
			roles,
		};
	}),
	onlineSessions: adminProcedure.query(async ({ ctx }) => {
		const data = await ctx.prisma.onlineSession.findMany({
			select: {
				createdAt: true,
			},
		});

		const dataMap = data.reduce<Record<string, number>>(
			(accumulator, current) => {
				const createdAt = current.createdAt;

				if (
					new Date(createdAt).getTime() <
					Date.now() - 30 * 24 * 60 * 60 * 1000
				) {
					return accumulator;
				}

				const date = new Date(createdAt)
					.toLocaleDateString('en-GB')
					.replace(/\//g, '-');

				if (accumulator[date] !== 0) {
					accumulator[date] += 1;
				} else {
					accumulator[date] = 1;
				}

				return accumulator;
			},
			Object.fromEntries(
				Array.from(
					{
						length: 30,
					},
					(_, i) => [
						new Date(Date.now() - i * 24 * 60 * 60 * 1000)
							.toLocaleDateString('en-GB')
							.replace(/\//g, '-'),
						0,
					],
				),
			),
		);

		const dataArr = Object.entries(dataMap).map(([date, count]) => ({
			date,
			'Total Online Users': count,
		}));

		return dataArr.reverse();
	}),
	webActions: adminProcedure
		.input(
			z
				.object({
					page: z.number().positive(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const { page } = input;

			const skip = page * MAX_LIMIT - MAX_LIMIT;
			const take = MAX_LIMIT;

			const count = await ctx.prisma.webAction.count();

			const data = await ctx.prisma.webAction.findMany({
				select: {
					id: true,
					action: true,
					path: true,
					message: true,
					createdAt: true,
					user: {
						select: {
							name: true,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take,
			});

			return {
				count,
				data,
			};
		}),
	users: usersRouter,
	roles: rolesRouter,
});
