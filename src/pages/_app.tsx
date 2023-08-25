import '../styles/globals.css';

import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import type { AppType } from 'next/app';
import Head from 'next/head';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

import { mantineCache } from '../utils/mantineCache';
import { trpc } from '../utils/trpc';

const App: AppType<{ session: Session | null }> = ({
	Component,
	pageProps: { session, ...pageProps },
}) => {
	return (
		<SessionProvider session={session}>
			<Head>
				<meta charSet="utf-8" />
				<meta httpEquiv="X-UA-Compatible" content="IE=edge" />

				<meta
					name="viewport"
					content="width=device-width, initial-scale=1"
				/>

				<link rel="manifest" href="/manifest.json" />
				<link
					href="/favicon-16x16.png"
					rel="icon"
					type="image/png"
					sizes="16x16"
				/>
				<link
					href="/favicon-32x32.png"
					rel="icon"
					type="image/png"
					sizes="32x32"
				/>

				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<meta name="theme-color" content="#ffffff" />
			</Head>
			<MantineProvider
				withGlobalStyles
				withNormalizeCSS
				emotionCache={mantineCache}
				theme={{
					breakpoints: {
						sm: '640',
						md: '768',
						lg: '1024',
						xl: '1280',
					},
					components: {
						Input: {
							styles: {
								input: {
									'&:focus': {
										borderColor: '#595758',
									},
								},
							},
						},
					},
				}}
			>
				<ModalsProvider>
					<Notifications />
					<Component {...pageProps} />
				</ModalsProvider>
			</MantineProvider>
		</SessionProvider>
	);
};

export default trpc.withTRPC(App);
