// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import NextAuth, { type NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

import { env } from '../../../env/server';
import { prisma } from '../../../utils/prisma';

export const authOptions: NextAuthOptions = {
	session: {
		maxAge: 60 * 60 * 24 * 1, // 1 day
	},
	callbacks: {
		signIn(params) {
			if (params.user?.email?.endsWith('@fairview.sti.edu.ph')) {
				return true;
			}

			if (params.user?.email?.endsWith('@fairview.sti.edu')) {
				return true;
			}

			return false;
		},
		session({ session, user }) {
			if (session.user) {
				session.user.id = user.id;
				session.user.isAdmin = user.isAdmin;
			}

			return session;
		},
	},
	// Configure one or more authentication providers
	adapter: PrismaAdapter(prisma),
	providers: [
		AzureADProvider({
			clientId: env.AZURE_AD_CLIENT_ID,
			clientSecret: env.AZURE_AD_CLIENT_SECRET,
			tenantId: 'common',
			authorization: {
				params: {
					prompt: 'consent',
				},
			},
		}),
		// ...add more providers here
	],
	theme: {
		logo: '/favicon.ico',
	},
};

export default NextAuth(authOptions);
