import { Button } from '@mantine/core';
import { Notification } from '@prisma/client';
import { IconBook, IconBookOff, IconTrash } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { useState } from 'react';

import { PageTitle } from '../components/PageTitle';
import Layout from '../modules/Layout';
import { createGetServerSideProps } from '../server/common/createGetServerSideProps';
import { RelativeFormat } from '../utils/RelativeFormat';
import { trpc } from '../utils/trpc';

export const getServerSideProps = createGetServerSideProps('user');

export default function UserNotifications() {
	const router = useRouter();
	const utils = trpc.useContext();
	const [page, setPage] = useState(1);

	const [selectedNotifications, setSelectedNotifications] = useState<
		Notification[]
	>([]);

	const { data: stats } = trpc.self.stats.useQuery();
	const { data: notifications, isLoading } = trpc.self.notifications.useQuery(
		{
			page,
			MAX_LIMIT: 10,
		},
	);

	const read = trpc.self.markAsReadNotification.useMutation({
		onSuccess: async () => {
			setSelectedNotifications([]);
			await utils.self.invalidate();
		},
	});

	const unread = trpc.self.markAsUnreadNotification.useMutation({
		onSuccess: async () => {
			setSelectedNotifications([]);
			await utils.self.invalidate();
		},
	});

	const deleteNotification = trpc.self.deleteNotification.useMutation({
		onSuccess: async () => {
			setSelectedNotifications([]);
			await utils.self.invalidate();
		},
	});

	return (
		<Layout>
			<NextSeo title="My Notifications" />
			<div className="grid gap-y-5">
				<PageTitle>My Notifications</PageTitle>

				{stats && notifications ? (
					<div className="grid gap-y-5 select-none">
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
							<Button
								disabled={selectedNotifications.length === 0}
								onClick={() => {
									read.mutate({
										id: selectedNotifications.map(
											(x) => x.id,
										),
									});
								}}
								color="green"
								leftIcon={<IconBook size={16} />}
							>
								Mark as Read
							</Button>
							<Button
								disabled={selectedNotifications.length === 0}
								onClick={() => {
									unread.mutate({
										id: selectedNotifications.map(
											(x) => x.id,
										),
									});
								}}
								color="yellow"
								leftIcon={<IconBookOff size={16} />}
							>
								Mark as Unread
							</Button>
							<Button
								disabled={selectedNotifications.length === 0}
								onClick={() => {
									deleteNotification.mutate({
										id: selectedNotifications.map(
											(x) => x.id,
										),
									});
								}}
								color="red"
								leftIcon={<IconTrash size={16} />}
							>
								Delete
							</Button>
						</div>
						<DataTable
							minHeight={450}
							fetching={isLoading}
							withBorder
							borderRadius="md"
							shadow="md"
							withColumnBorders
							highlightOnHover
							page={page}
							recordsPerPage={10}
							onPageChange={(p) => {
								setSelectedNotifications([]);
								setPage(p);
							}}
							records={notifications.list}
							totalRecords={notifications.count}
							selectedRecords={selectedNotifications}
							onSelectedRecordsChange={setSelectedNotifications}
							noRecordsText="You have no notifications"
							onRowClick={({ path }) => {
								router.push(path);
							}}
							rowStyle={({ read }) =>
								read
									? { color: '#030712' }
									: {
											color: '#374151',
											backgroundColor: '#eff6ff',
									  }
							}
							columns={[
								{
									accessor: 'title',
									title: 'Title',
									render: ({ title }) => (
										<p className="font-semibold text-lg whitespace-nowrap text-gray-700">
											{title}
										</p>
									),
								},
								{
									accessor: 'message',
									title: 'Message',
									render: ({ message }) => (
										<p className="text-sm whitespace-nowrap text-gray-700">
											{message}
										</p>
									),
								},
								{
									accessor: 'createdAt',
									title: 'Created At',
									textAlignment: 'center',
									render: ({ createdAt }) => (
										<p className="text-sm whitespace-nowrap text-gray-700">
											{RelativeFormat(createdAt)}
										</p>
									),
								},
							]}
						/>
					</div>
				) : null}
			</div>
		</Layout>
	);
}
