import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

import type { Context } from './context';
import { onlineUsers } from './stores';

const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;

export const publicProcedure = t.procedure;

export const authProcedure = publicProcedure.use(
	t.middleware(({ ctx, next }) => {
		if (ctx.session?.user) {
			if (
				ctx.session?.user?.id &&
				ctx.session?.user.name &&
				ctx.session?.user.email
			) {
				onlineUsers.set(ctx.session.user.id, {
					name: ctx.session.user.name,
					email: ctx.session.user.email,
				});
			}

			return next({
				ctx: {
					// infers the `session` as non-nullable
					session: { ...ctx.session, user: ctx.session.user },
				},
			});
		}

		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}),
);

export const adminProcedure = t.procedure.use(
	t.middleware(({ ctx, next }) => {
		if (ctx.session?.user?.isAdmin) {
			return next({
				ctx: {
					// infers the `session` as non-nullable
					session: { ...ctx.session, user: ctx.session.user },
				},
			});
		}

		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}),
);
