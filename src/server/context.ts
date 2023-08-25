import type { inferAsyncReturnType } from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { NodeHTTPCreateContextFnOptions } from '@trpc/server/adapters/node-http';
import { IncomingMessage } from 'http';
import type { Session } from 'next-auth';
import { getSession } from 'next-auth/react';
import ws from 'ws';

import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { storage } from './storage';

type CreateContextOptions = {
	session: Session | null;
};

/** Use this helper for:
 * - testing, so we dont have to mock Next.js' req/res
 * - trpc's `createSSGHelpers` where we don't have req/res
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 **/
export const createContextInner = async (opts: CreateContextOptions) => {
	return {
		prisma,
		redis,
		storage,
		...opts,
	};
};

/**
 * This is the actual context you'll use in your router
 * @link https://trpc.io/docs/context
 **/
export const createContext = async (
	opts:
		| CreateNextContextOptions
		| NodeHTTPCreateContextFnOptions<IncomingMessage, ws>,
) => {
	const session = await getSession(opts);

	return await createContextInner({
		session,
	});
};

export type Context = inferAsyncReturnType<typeof createContext>;
