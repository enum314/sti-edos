import { z } from 'zod';

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const serverSchema = z.object({
	DATABASE_URL: z.string().url(),
	REDIS_URL: z.string().url(),
	NODE_ENV: z.enum(['development', 'test', 'production']),
	NEXTAUTH_SECRET:
		process.env.NODE_ENV === 'production'
			? z.string().min(1)
			: z.string().min(1).optional(),
	NEXTAUTH_URL: z.preprocess(
		// This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
		// Since NextAuth.js automatically uses the VERCEL_URL if present.
		(str) => process.env.VERCEL_URL ?? str,
		// VERCEL_URL doesn't include `https` so it cant be validated as a URL
		process.env.VERCEL ? z.string() : z.string().url(),
	),
	APP_URL: z.string().url(),
	WS_URL: z.string().url(),
	AZURE_AD_CLIENT_ID: z.string(),
	AZURE_AD_CLIENT_SECRET: z.string(),
	WEB_PUSH_EMAIL: z.string().email(),
	WEB_PUSH_PRIVATE_KEY: z.string(),
	STORAGE_BUCKET: z.string(),
	STORAGE_ACCESS_KEY: z.string(),
	STORAGE_SECRET_KEY: z.string(),
	STORAGE_ENDPOINT: z.string().url(),
	STORAGE_REGION: z.string(),
});

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const clientSchema = z.object({
	NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: z.string(),
});

/**
 * You can't destruct `process.env` as a regular object, so you have to do
 * it manually here. This is because Next.js evaluates this at build time,
 * and only used environment variables are included in the build.
 */
export const clientEnv: {
	[k in keyof z.infer<typeof clientSchema>]:
		| z.infer<typeof clientSchema>[k]
		| undefined;
} = {
	NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY:
		process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY,
};
