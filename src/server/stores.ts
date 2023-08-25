import { env } from '../env/server';
import Store from '../utils/Store';

export const attachmentUrls = new Store<{ value: string }>('attachments', 300);

declare global {
	// eslint-disable-next-line no-var
	var onlineUsers: Map<string, { name: string; email: string }> | undefined;
}

export const onlineUsers =
	global.onlineUsers || new Map<string, { name: string; email: string }>();

if (env.NODE_ENV !== 'production') {
	global.onlineUsers = onlineUsers;
}
