import { Menu } from '@mantine/core';
import { openConfirmModal } from '@mantine/modals';
import { IconLogout } from '@tabler/icons-react';
import { signOut } from 'next-auth/react';

export default function Logout() {
	return (
		<Menu.Item
			color="red"
			icon={<IconLogout size={14} />}
			onClick={() => {
				openConfirmModal({
					id: 'logout',
					title: 'Log Out',
					centered: true,
					children: <p>Are you sure you want to logout?</p>,
					labels: {
						confirm: 'Log Out',
						cancel: 'Cancel',
					},
					overlayProps: {
						color: 'white',
						opacity: 0.65,
						blur: 0.75,
					},
					confirmProps: { color: 'red' },
					onCancel: () => console.log('Cancel'),
					onConfirm: () => {
						signOut().finally(() => {
							if ('serviceWorker' in navigator) {
								navigator.serviceWorker
									.getRegistrations()
									.then(async (registrations) => {
										for (const registration of registrations) {
											const subscription =
												await registration.pushManager.getSubscription();
											if (subscription) {
												const payload = {
													endpoint:
														subscription.endpoint,
												};

												fetch(`/api/unsub`, {
													method: 'POST',
													headers: {
														'content-type':
															'application/json',
													},
													body: JSON.stringify(
														payload,
													),
												});
												subscription?.unsubscribe();
											}
										}
									});
							}

							window.location.href = '/auth/login';
						});
					},
				});
			}}
		>
			Logout
		</Menu.Item>
	);
}
