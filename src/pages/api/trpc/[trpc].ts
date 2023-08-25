import * as trpcNext from '@trpc/server/adapters/next';

import { env } from '../../../env/server';
import { createContext } from '../../../server/context';
import { appRouter } from '../../../server/routers/app';

export default trpcNext.createNextApiHandler({
	router: appRouter,
	createContext,
	onError:
		env.NODE_ENV === 'development'
			? ({ path, error }) => {
					console.error(`❌ tRPC failed on ${path}: ${error}`);
			  }
			: undefined,
	batching: {
		enabled: true,
	},
});
