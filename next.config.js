// eslint-disable-next-line @typescript-eslint/no-var-requires
const NextPWA = require('next-pwa');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const runtimeCaching = require('next-pwa/cache');

const securityHeaders = [
	{
		key: 'X-DNS-Prefetch-Control',
		value: 'on',
	},
	{
		key: 'X-Frame-Options',
		value: 'SAMEORIGIN',
	},
];

/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = NextPWA({
	dest: 'public',
	sw: 'service-worker.js',
	runtimeCaching,
	register: true,
	skipWaiting: true,
	buildExcludes: [/middleware-manifest.json$/],
	disable: process.env.NODE_ENV === 'development',
})({
	reactStrictMode: true,
	poweredByHeader: false,
	experimental: {
		appDir: false,
	},
	async headers() {
		return [
			{
				source: '/:path*',
				headers: securityHeaders,
			},
		];
	},
	serverRuntimeConfig: {
		// Will only be available on the server side
	},
	publicRuntimeConfig: {
		// Will be available on both server and client
		APP_URL: process.env.APP_URL,
		WS_URL: process.env.WS_URL,
	},
});
