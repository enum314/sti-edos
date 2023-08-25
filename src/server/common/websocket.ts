import EventEmitter from 'events';

export interface WebSocketEvents {
	violationMessage: [
		message: {
			id: string;
			type: 'system' | 'message';
			violationId: number;
			author: string;
			content: string;
			createdAt: Date;
		},
	];
	permitMessage: [
		message: {
			id: string;
			type: 'system' | 'message';
			permitId: number;
			author: string;
			content: string;
			createdAt: Date;
		},
	];
	notification: [
		payload: {
			receiverId: string;
			id: string;
			title: string;
			message: string;
			path: string;
		},
	];
}

type Listener<K extends keyof WebSocketEvents> = (
	...args: WebSocketEvents[K]
) => void;

interface WebSocket {
	on<T extends keyof WebSocketEvents>(event: T, listener: Listener<T>): this;
	off<T extends keyof WebSocketEvents>(event: T, listener: Listener<T>): this;
	once<T extends keyof WebSocketEvents>(
		event: T,
		listener: Listener<T>,
	): this;
	emit<T extends keyof WebSocketEvents>(
		event: T,
		...args: WebSocketEvents[T]
	): boolean;
}

class WebSocket extends EventEmitter {}

export const websocket = new WebSocket();
