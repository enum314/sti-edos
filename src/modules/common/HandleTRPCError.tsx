import { showNotification } from '@mantine/notifications';
import { IconAlertTriangle, IconHandStop } from '@tabler/icons-react';
import { Maybe } from '@trpc/server';
import { DefaultErrorData } from '@trpc/server/dist/error/formatter';

export function HandleTRPCError(opts?: {
	messages?: {
		TOO_MANY_REQUESTS?: string;
	};
}) {
	return (ctx: { message: string; data: Maybe<DefaultErrorData> }) => {
		switch (ctx.data?.code) {
			case 'TOO_MANY_REQUESTS': {
				return showNotification({
					color: 'red',
					title: 'Slow down!',
					message:
						opts?.messages?.TOO_MANY_REQUESTS ??
						'You are being rate limited',
					icon: <IconHandStop />,
				});
			}
			default: {
				showNotification({
					color: 'red',
					title: 'Error!',
					icon: <IconAlertTriangle />,
					message: ctx.message ?? 'Unknown error occured',
				});

				if (!ctx.message) {
					console.error(ctx);
				}
			}
		}
	};
}
