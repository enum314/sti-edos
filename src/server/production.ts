import 'dotenv/config';

import { applyWSSHandler } from '@trpc/server/adapters/ws';
import http from 'http';
import next from 'next';
import { parse } from 'url';
import ws from 'ws';

import { env } from '../env/server';
import { createContext } from './context';
import { appRouter } from './routers/app';

const port = 3000;
const dev = env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
	const server = http.createServer((req, res) => {
		const proto = req.headers['x-forwarded-proto'];
		if (proto && proto === 'http') {
			// redirect to ssl
			res.writeHead(303, {
				location:
					`https://` + req.headers.host + (req.headers.url ?? ''),
			});
			res.end();
			return;
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const parsedUrl = parse(req.url!, true);
		handle(req, res, parsedUrl);
	});

	const wss = new ws.Server({ server });
	const handler = applyWSSHandler({ wss, router: appRouter, createContext });

	wss.on('connection', (ws) => {
		console.log(`+ Connection (${wss.clients.size})`);

		ws.once('close', () => {
			console.log(`- Connection (${wss.clients.size})`);
		});
	});

	process.on('SIGTERM', () => {
		handler.broadcastReconnectNotification();
	});

	server.listen(port);

	// tslint:disable-next-line:no-console
	console.log(
		`> Server listening at http://localhost:${port} as ${
			dev ? 'development' : process.env.NODE_ENV
		}`,
	);
});
