import { TRPCError } from '@trpc/server';
import {
	IRateLimiterStoreOptions,
	RateLimiterRedis,
	RateLimiterRes,
} from 'rate-limiter-flexible';

import { redis } from '../../utils/redis';
import { middleware } from '../trpc';

interface RateLimitOptions {
	points: number;
	duration: number;
}

async function consume(
	userId: string,
	keyPrefix: string,
	options: RateLimitOptions,
) {
	const opts: IRateLimiterStoreOptions = {
		storeClient: redis,
		keyPrefix: `ratelimit.${keyPrefix}`,
		points: options.points,
		duration: options.duration,
	};

	const rateLimiter = new RateLimiterRedis(opts);

	try {
		await rateLimiter.consume(userId);

		return {
			rateLimited: false,
		};
	} catch (err) {
		if (err instanceof RateLimiterRes) {
			return {
				rateLimited: true,
			};
		}

		throw err;
	}
}

export const rateLimit = (key: string, opts: RateLimitOptions) =>
	middleware(async ({ ctx, next }) => {
		if (ctx.session?.user) {
			try {
				const status = await consume(ctx.session.user.id, key, opts);

				if (status.rateLimited) {
					throw new TRPCError({
						code: 'TOO_MANY_REQUESTS',
					});
				}

				return next({
					ctx: {
						// infers the `session` as non-nullable
						session: {
							...ctx.session,
							user: ctx.session.user,
						},
					},
				});
			} catch (err) {
				if (
					err instanceof TRPCError &&
					err.code === 'TOO_MANY_REQUESTS'
				) {
					throw err;
				}

				console.error(err);
				throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
			}
		}

		throw new TRPCError({ code: 'UNAUTHORIZED' });
	});
