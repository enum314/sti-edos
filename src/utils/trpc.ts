import { createWSClient, httpBatchLink, wsLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import { NextPageContext } from 'next';
import getConfig from 'next/config';
import superjson from 'superjson';

import type { AppRouter } from '../server/routers/app';

interface RuntimeConfig {
	APP_URL: string;
	WS_URL: string;
}

const { publicRuntimeConfig } = getConfig() as {
	publicRuntimeConfig: RuntimeConfig;
};

const { APP_URL, WS_URL } = publicRuntimeConfig as RuntimeConfig;

function getEndingLink(ctx: NextPageContext | undefined) {
	if (typeof window === 'undefined') {
		return httpBatchLink({
			url: `${APP_URL}/api/trpc`,
			headers() {
				if (ctx?.req) {
					// on ssr, forward client's headers to the server
					return {
						...ctx.req.headers,
						'x-ssr': '1',
					};
				}
				return {};
			},
		});
	}

	const client = createWSClient({
		url: WS_URL,
	});

	return wsLink<AppRouter>({
		client,
	});
}

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createReactQueryHooks`.
 * @link https://trpc.io/docs/react#3-create-trpc-hooks
 */
export const trpc = createTRPCNext<AppRouter>({
	config({ ctx }) {
		/**
		 * If you want to use SSR, you need to use the server's full URL
		 * @link https://trpc.io/docs/ssr
		 */

		return {
			/**
			 * @link https://trpc.io/docs/links
			 */
			links: [getEndingLink(ctx)],
			/**
			 * @link https://trpc.io/docs/data-transformers
			 */
			transformer: superjson,
			/**
			 * @link https://react-query.tanstack.com/reference/QueryClient
			 */
			queryClientConfig: {
				defaultOptions: { queries: { staleTime: 60 } },
			},
		};
	},
	/**
	 * @link https://trpc.io/docs/ssr
	 */
	ssr: false,
});
