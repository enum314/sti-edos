import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';

import { AnnouncementCard } from '../../../components/AnnouncementCard';
import { Card } from '../../../components/Card';
import { PageTitle } from '../../../components/PageTitle';
import Layout from '../../../modules/Layout';
import { restrictedGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { Permission } from '../../../utils/Constants';
import { RelativeFormat } from '../../../utils/RelativeFormat';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = restrictedGetServerSideProps({
	or: [Permission.PANEL_ANNOUNCEMENT_MANAGE],
});

export default function PanelAnnouncements() {
	const router = useRouter();

	const { data: list } = trpc.announcement.list.useQuery();

	return (
		<Layout>
			<NextSeo title="Announcement Management" />
			<div className="grid gap-y-5">
				<PageTitle>Announcement Management</PageTitle>
				<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					<Button
						color="green"
						leftIcon={<IconPlus />}
						onClick={() => {
							router.push('/panel/announcements/create');
						}}
					>
						Create New Announcement
					</Button>
				</div>
				<Card title="Announcements">
					<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
						{list?.data?.map((announcement) => (
							<AnnouncementCard
								key={announcement.id}
								id={announcement.id}
								title={announcement.title}
								message={announcement.message}
								date={RelativeFormat(announcement.createdAt)}
								datetime={announcement.createdAt.toDateString()}
								author={{
									...announcement.author,
									name: announcement.author.name as string,
								}}
								ratings={announcement.ratings.map(
									(x) => x.rating,
								)}
							/>
						)) ?? <></>}
					</div>
				</Card>
			</div>
		</Layout>
	);
}
