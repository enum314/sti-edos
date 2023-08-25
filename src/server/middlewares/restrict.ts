import { Prisma, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import Redis from 'ioredis';
import { Session } from 'next-auth';

import { hasPermission, RestrictOptions } from '../../utils/hasPermission';
import { middleware } from '../trpc';

export function restrict<T = undefined>(
	opts: RestrictOptions,
	additionalCheck?: (
		ctx: {
			session: Session;
			prisma: PrismaClient<
				Prisma.PrismaClientOptions,
				never,
				Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
			>;
			redis: Redis;
		},
		input: T,
	) => Promise<boolean> | boolean,
) {
	return middleware(async ({ ctx, next, input }) => {
		if (ctx.session?.user) {
			if (ctx.session.user.isAdmin) {
				return next({
					ctx: {
						// infers the `session` as non-nullable
						session: {
							...ctx.session,
							user: ctx.session.user,
						},
					},
				});
			}

			const user = await ctx.prisma.user.findUnique({
				select: {
					role: true,
				},
				where: {
					id: ctx.session.user.id,
				},
			});

			if (user?.role) {
				const { role } = user;

				if (hasPermission(opts, role, ctx.session.user.isAdmin)) {
					return next({
						ctx: {
							// infers the `session` as non-nullable
							session: {
								...ctx.session,
								user: ctx.session.user,
							},
						},
					});
				}
			}

			if (
				additionalCheck &&
				(await additionalCheck(
					{
						...ctx,
						// infers the `session` as non-nullable
						session: {
							...ctx.session,
							user: ctx.session.user,
						},
					},
					input as T,
				))
			) {
				return next({
					ctx: {
						// infers the `session` as non-nullable
						session: {
							...ctx.session,
							user: ctx.session.user,
						},
					},
				});
			}
		}

		throw new TRPCError({ code: 'UNAUTHORIZED' });
	});
}
