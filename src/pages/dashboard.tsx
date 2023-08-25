import { ScrollArea, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconBell, IconLicense } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';

import { AnnouncementCard } from '../components/AnnouncementCard';
import { Card } from '../components/Card';
import { InfoCard } from '../components/InfoCard';
import { PageTitle } from '../components/PageTitle';
import { ProfileAvatar } from '../components/ProfileAvatar';
import Layout from '../modules/Layout';
import { createGetServerSideProps } from '../server/common/createGetServerSideProps';
import { RelativeFormat } from '../utils/RelativeFormat';
import { trpc } from '../utils/trpc';

export const getServerSideProps = createGetServerSideProps('user');

export default function UserDashboard() {
	const router = useRouter();

	const { data: stats } = trpc.self.stats.useQuery();
	const { data: onlineUsers } = trpc.self.onlineUsers.useQuery();
	const { data: list } = trpc.announcement.list.useQuery();

	return (
		<Layout>
			<NextSeo title="User Dashboard" />
			{stats ? (
				<>
					<div className="grid gap-y-5">
						<PageTitle>Dashboard</PageTitle>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 select-none">
							<InfoCard
								color="red"
								icon={
									<IconAlertTriangle
										color="white"
										size={36}
									/>
								}
								title={`Violations`}
								value={stats.violations.total.toString()}
								onClick={() => router.push('/violations')}
							/>
							<InfoCard
								color="green"
								icon={<IconLicense color="white" size={36} />}
								title={`Active Permits`}
								value={stats.activePermits.toString()}
								onClick={() => router.push('/permits')}
							/>
							<InfoCard
								color="blue"
								icon={<IconBell color="white" size={36} />}
								title={`Notifications`}
								value={stats.notifications.toString()}
								onClick={() => router.push('/notifications')}
							/>
						</div>
					</div>
					<div className="mt-5 gap-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
						<Card
							title="Announcements"
							className="md:col-span-2"
							noPadding
						>
							<ScrollArea style={{ height: 450 }} type="scroll">
								<div className="grid gap-y-5 p-5">
									{list?.data?.map((announcement) => (
										<AnnouncementCard
											key={announcement.id}
											id={announcement.id}
											title={announcement.title}
											message={announcement.message}
											date={RelativeFormat(
												announcement.createdAt,
											)}
											datetime={announcement.createdAt.toDateString()}
											author={{
												...announcement.author,
												name: announcement.author
													.name as string,
											}}
											ratings={announcement.ratings.map(
												(x) => x.rating,
											)}
										/>
									)) ?? <></>}
								</div>
							</ScrollArea>
						</Card>
						<Card title="Online Users">
							<div className="flex flex-wrap gap-5">
								{onlineUsers?.map((user) => (
									<Tooltip key={user.email} label={user.name}>
										<ProfileAvatar
											size="md"
											className="shadow-md"
										>
											{user.name}
										</ProfileAvatar>
									</Tooltip>
								))}
							</div>
						</Card>
					</div>
				</>
			) : null}
		</Layout>
	);
}
