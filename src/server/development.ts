import 'dotenv/config';

import { applyWSSHandler } from '@trpc/server/adapters/ws';
import fetch from 'node-fetch';
import ws from 'ws';

import { createContext } from './context';
import { appRouter } from './routers/app';

if (!global.fetch) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(global as any).fetch = fetch;
}

const wss = new ws.Server({
	port: 3001,
});

wss.on('connection', (ws) => {
	console.log(`+ Connection (${wss.clients.size})`);

	ws.once('close', () => {
		console.log(`- Connection (${wss.clients.size})`);
	});
});

const handler = applyWSSHandler({ wss, router: appRouter, createContext });

console.log('✅ WebSocket Server listening on ws://localhost:3001');

process.on('SIGTERM', () => {
	handler.broadcastReconnectNotification();
	wss.close();
});
