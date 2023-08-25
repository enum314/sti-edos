/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/no-static-element-interactions */

import {
	ActionIcon,
	Avatar,
	Badge,
	Button,
	MantineProvider,
	Menu,
	NavLink,
} from '@mantine/core';
import { hideNotification, showNotification } from '@mantine/notifications';
import { NavigationProgress, nprogress } from '@mantine/nprogress';
import {
	IconAlertTriangle,
	IconBell,
	IconChevronLeft,
	IconDashboard,
	IconExternalLink,
	IconGauge,
	IconInfoCircle,
	IconLicense,
	IconListDetails,
	IconMenu2,
	IconNews,
	IconShieldCheck,
	IconUserCircle,
	IconUserQuestion,
	IconUsers,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';

import Loading from '../components/Loading';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { Permission } from '../utils/Constants';
import { hasPermission } from '../utils/hasPermission';
import { trpc } from '../utils/trpc';
import { PushNotification } from './PushNotification';
import Logout from './self/Logout';

interface LayoutProps {
	children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
	const utils = trpc.useContext();
	const router = useRouter();
	const session = useSession();
	const [hideDrawer, setHideDrawer] = useState(true);
	const [loading, setLoading] = useState(false);

	const { data: stats } = trpc.self.stats.useQuery();
	const { data: role } = trpc.self.role.useQuery();

	useEffect(() => {
		const handleStart = (url: string) => {
			url !== router.asPath && nprogress.start();
			setLoading(true);
		};

		const handleComplete = () => {
			nprogress.complete();
			setLoading(false);
		};

		router.events.on('routeChangeStart', handleStart);
		router.events.on('routeChangeComplete', handleComplete);
		router.events.on('routeChangeError', handleComplete);

		return () => {
			router.events.off('routeChangeStart', handleStart);
			router.events.off('routeChangeComplete', handleComplete);
			router.events.off('routeChangeError', handleComplete);
		};
	}, [router.asPath, router.events]);

	trpc.self.notifier.useSubscription(undefined, {
		async onData(notification) {
			await utils.self.stats.invalidate();

			if (router.asPath !== notification.path) {
				showNotification({
					...notification,
					onClick: () => {
						router.push(notification.path);
						hideNotification(notification.id);
					},
				});
			}

			if (
				router.asPath.startsWith('/violations') &&
				notification.path.startsWith('/violation/')
			) {
				await utils.self.violations.invalidate();
			}

			if (
				router.asPath.startsWith('/profile/') &&
				(notification.path.startsWith('/permit/') ||
					notification.path.startsWith('/violation/'))
			) {
				await utils.profile.invalidate();
			}

			if (
				router.asPath.startsWith('/permits') &&
				notification.path.startsWith('/permit/')
			) {
				await utils.self.permits.invalidate();
			}

			if (
				router.asPath.startsWith('/announcement/') &&
				notification.path.startsWith('/announcement/')
			) {
				await utils.announcement.get.invalidate({
					id: notification.path.split('/')[2],
				});
			}

			if (
				(router.asPath.startsWith('/dashboard') ||
					router.asPath.startsWith('/panel/announcements')) &&
				notification.path.startsWith('/announcement/')
			) {
				await utils.announcement.invalidate();
			}

			if (
				router.asPath.startsWith('/violation/') &&
				notification.path.startsWith('/violation/')
			) {
				await utils.panel.violations.get.invalidate({
					id: Number(notification.path.split('/')[2]),
				});
			}

			if (
				router.asPath.startsWith('/permit/') &&
				notification.path.startsWith('/permit/')
			) {
				await utils.panel.permits.get.invalidate({
					id: Number(notification.path.split('/')[2]),
				});
			}

			if (
				router.asPath.startsWith('/panel/permits') &&
				notification.path.startsWith('/permit') &&
				hasPermission(
					{
						or: [Permission.PANEL_PERMIT_MANAGE],
					},
					role,
					session?.data?.user?.isAdmin ?? false,
				)
			) {
				await utils.panel.permits.invalidate();
			}
		},
		onError(err) {
			console.error('Subscription error:', err);
		},
	});

	return (
		<div className="bg-neutral-200 min-h-screen relative">
			<NavigationProgress color="white" autoReset={true} />
			<PushNotification />
			<nav
				className="md:ml-64 px-5 py-3 bg-blue-600 flex items-center"
				onMouseDown={() => setHideDrawer(true)}
			>
				<div className="md:hidden">
					<ActionIcon
						onClick={() => setHideDrawer(false)}
						variant="transparent"
					>
						<IconMenu2 color="white" />
					</ActionIcon>
				</div>

				<div className="hidden md:flex md:items-center md:gap-x4">
					<ActionIcon
						variant="transparent"
						onClick={() => {
							router.back();
						}}
					>
						<IconChevronLeft color="white" />
					</ActionIcon>
				</div>

				<div className="ml-auto flex items-center">
					<Menu
						openDelay={100}
						closeDelay={400}
						shadow="lg"
						withArrow
					>
						<Menu.Target>
							<div>
								{session ? (
									<>
										<div className="hidden md:block">
											<Button
												color="dark"
												variant="white"
												leftIcon={
													<ProfileAvatar size="32px">
														{(session?.data?.user
															?.name as string) ??
															''}
													</ProfileAvatar>
												}
												className="flex items-center"
											>
												{session?.data?.user?.name}
											</Button>
										</div>
										<div className="md:hidden">
											<ProfileAvatar size="md">
												{
													session?.data?.user
														?.name as string
												}
											</ProfileAvatar>
										</div>
									</>
								) : null}
							</div>
						</Menu.Target>

						<Menu.Dropdown>
							<Menu.Label>
								{session?.data?.user?.email}
							</Menu.Label>
							<Menu.Item
								component={Link}
								href={`/profile/${session?.data?.user?.id}`}
								icon={<IconUserCircle size={14} />}
							>
								Profile
							</Menu.Item>
							<Menu.Divider />
							<Logout />
						</Menu.Dropdown>
					</Menu>
				</div>
			</nav>
			<aside
				className={`select-none w-64 fixed top-0 left-0 bottom-0 z-40 h-screen transition-transform ${
					hideDrawer ? 'sidebar-translate' : ''
				} md:translate-x-0`}
				aria-label="sidebar"
			>
				<div className="pt-3 relative tracking-wide leading-4 antialiased h-full bg-neutral-900 text-gray-300 overflow-y-auto scrollbar-none">
					<div className="flex items-center mb-5 gap-x-5 flex-nowrap px-5">
						<Avatar
							size="md"
							src="/icon-192x192.png"
							alt="logo"
							radius="xl"
						/>
						<p className="text-xl font-semibold text-gray-300 tracking-wide">
							STI eDOS
						</p>
					</div>
					<MantineProvider theme={{ colorScheme: 'dark' }}>
						<NavLink
							label="Overview"
							childrenOffset={0}
							defaultOpened
						>
							<NavLink
								component={Link}
								href="/dashboard"
								icon={<IconDashboard />}
								label="Dashboard"
								active={router.pathname === '/dashboard'}
							/>
							<NavLink
								component={Link}
								href="/notifications"
								icon={<IconBell />}
								label="Notifications"
								active={router.pathname === '/notifications'}
								rightSection={
									<Badge
										size="md"
										color="blue"
										w={16}
										h={16}
										p={0}
									>
										{stats?.notifications ?? 0}
									</Badge>
								}
							/>
							<NavLink
								component={Link}
								href="/violations"
								icon={<IconAlertTriangle />}
								label="Violations"
								active={router.pathname.startsWith(
									'/violations',
								)}
							/>
							<NavLink
								component={Link}
								href="/permits"
								icon={<IconLicense />}
								label="Permits"
								active={router.pathname.startsWith('/permits')}
							/>
						</NavLink>
						{hasPermission(
							{
								or: [
									Permission.PANEL_ANNOUNCEMENT_MANAGE,
									Permission.PANEL_VIOLATION_MANAGE,
									Permission.PANEL_PERMIT_MANAGE,
									Permission.PANEL_USER_PROFILES_VIEW,
								],
							},
							role,
							session?.data?.user?.isAdmin ?? false,
						) ? (
							<NavLink
								label="Staff Panel"
								defaultOpened
								childrenOffset={0}
							>
								{hasPermission(
									{
										or: [
											Permission.PANEL_ANNOUNCEMENT_MANAGE,
										],
									},
									role,
									session?.data?.user?.isAdmin ?? false,
								) ? (
									<NavLink
										component={Link}
										href="/panel/announcements"
										icon={<IconNews />}
										label="Announcements"
										active={router.pathname.startsWith(
											'/panel/announcements',
										)}
									/>
								) : null}
								{hasPermission(
									{
										or: [Permission.PANEL_VIOLATION_MANAGE],
									},
									role,
									session?.data?.user?.isAdmin ?? false,
								) ? (
									<NavLink
										component={Link}
										href="/panel/violations"
										icon={<IconAlertTriangle />}
										label="Violation Management"
										active={router.pathname.startsWith(
											'/panel/violations',
										)}
									/>
								) : null}
								{hasPermission(
									{
										or: [Permission.PANEL_PERMIT_MANAGE],
									},
									role,
									session?.data?.user?.isAdmin ?? false,
								) ? (
									<NavLink
										component={Link}
										href="/panel/permits"
										icon={<IconLicense />}
										label="Permit Management"
										active={router.pathname.startsWith(
											'/panel/permits',
										)}
									/>
								) : null}
								{hasPermission(
									{
										or: [
											Permission.PANEL_USER_PROFILES_VIEW,
										],
									},
									role,
									session?.data?.user?.isAdmin ?? false,
								) ? (
									<NavLink
										component={Link}
										href="/panel/users"
										icon={<IconUserQuestion />}
										label="User Profiles"
										active={router.pathname.startsWith(
											'/panel/users',
										)}
									/>
								) : null}
							</NavLink>
						) : null}
						{session?.data?.user?.isAdmin ? (
							<NavLink
								label="Administration"
								defaultOpened
								childrenOffset={0}
							>
								<NavLink
									component={Link}
									href="/admin"
									icon={<IconGauge />}
									label="Overview"
									active={router.pathname === '/admin'}
								/>
								<NavLink
									component={Link}
									href="/admin/users"
									icon={<IconUsers />}
									label="User Management"
									active={router.pathname.startsWith(
										'/admin/users',
									)}
								/>
								<NavLink
									component={Link}
									href="/admin/roles"
									icon={<IconShieldCheck />}
									label="Role Management"
									active={router.pathname.startsWith(
										'/admin/roles',
									)}
								/>
								<NavLink
									component={Link}
									href="/admin/weblogs"
									icon={<IconListDetails />}
									label="Website Logs"
									active={router.pathname.startsWith(
										'/admin/weblogs',
									)}
								/>
							</NavLink>
						) : null}
						<NavLink
							component={Link}
							href="/credits"
							icon={<IconInfoCircle />}
							label="Credits"
							active={router.pathname === '/credits'}
						/>
						<NavLink
							component={Link}
							href="https://docs.google.com/forms/d/e/1FAIpQLSc_Jgz4q8HVtuINvDURjlFCsUT3aLNGwluOp5A0B5vpdQpZAA/viewform"
							target="_blank"
							icon={<IconExternalLink />}
							label="Survey"
							active={false}
						/>
					</MantineProvider>
				</div>
			</aside>
			{loading ? (
				<div className="md:ml-64 grid place-items-center h-[85vh]">
					<Loading className="my-auto" />
				</div>
			) : (
				<div
					className="p-5 md:ml-64"
					onMouseDown={() => setHideDrawer(true)}
				>
					{children}
				</div>
			)}
		</div>
	);
};

export default Layout;
