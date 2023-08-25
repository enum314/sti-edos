import { IconLicense, IconLoader, IconThumbDown } from '@tabler/icons-react';
import { NextSeo } from 'next-seo';

import { InfoCard } from '../components/InfoCard';
import { PageTitle } from '../components/PageTitle';
import Layout from '../modules/Layout';
import { Permits } from '../modules/self/Permits';
import { createGetServerSideProps } from '../server/common/createGetServerSideProps';
import { trpc } from '../utils/trpc';

export const getServerSideProps = createGetServerSideProps('user');

export default function MyPermits() {
	const { data: stats } = trpc.self.stats.useQuery();

	return (
		<Layout>
			<NextSeo title="My Permits" />

			<div className="grid gap-y-5">
				<PageTitle>My Permits</PageTitle>
				{stats ? (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 select-none">
							<InfoCard
								color="green"
								icon={<IconLicense color="white" size={36} />}
								title={`Active Permits`}
								value={stats.activePermits.toString()}
								onClick={() => {
									/** */
								}}
							/>
							<InfoCard
								color="blue"
								icon={<IconLoader color="white" size={36} />}
								title={`Pending Permits`}
								value={stats.pendingPermits.toString()}
								onClick={() => {
									/** */
								}}
							/>
							<InfoCard
								color="red"
								icon={<IconThumbDown color="white" size={36} />}
								title={`Rejected Permits`}
								value={stats.rejectedPermits.toString()}
								onClick={() => {
									/** */
								}}
							/>
						</div>
					</>
				) : null}

				<Permits />
			</div>
		</Layout>
	);
}
