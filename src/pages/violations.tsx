import { IconAlertTriangle } from '@tabler/icons-react';
import { NextSeo } from 'next-seo';

import { InfoCard } from '../components/InfoCard';
import { PageTitle } from '../components/PageTitle';
import Layout from '../modules/Layout';
import { Violations } from '../modules/self/Violations';
import { createGetServerSideProps } from '../server/common/createGetServerSideProps';
import { trpc } from '../utils/trpc';

export const getServerSideProps = createGetServerSideProps('user');

export default function MyViolations() {
	const { data: stats } = trpc.self.stats.useQuery();

	return (
		<Layout>
			<NextSeo title="My Violations" />

			<div className="grid gap-y-5">
				<PageTitle>My Violations</PageTitle>
				{stats ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 select-none">
						<InfoCard
							color="blue"
							icon={<IconAlertTriangle color="white" size={36} />}
							title={`Total Violations`}
							value={stats.violations.total.toString()}
							onClick={() => {
								/** */
							}}
						/>
						<InfoCard
							color="yellow"
							icon={<IconAlertTriangle color="white" size={36} />}
							title={`Minor Violations`}
							value={stats.violations.minor.toString()}
							onClick={() => {
								/** */
							}}
						/>
						<InfoCard
							color="red"
							icon={<IconAlertTriangle color="white" size={36} />}
							title={`Major Violations`}
							value={(
								stats.violations.majorA +
								stats.violations.majorB +
								stats.violations.majorC +
								stats.violations.majorD
							).toString()}
							onClick={() => {
								/** */
							}}
						/>
					</div>
				) : null}

				<Violations />
			</div>
		</Layout>
	);
}
