import { Code, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconLicense, IconUser } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip as RechartTooltip,
	XAxis,
	YAxis,
} from 'recharts';

import { Card } from '../../components/Card';
import { InfoCard } from '../../components/InfoCard';
import { PageTitle } from '../../components/PageTitle';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import Layout from '../../modules/Layout';
import { createGetServerSideProps } from '../../server/common/createGetServerSideProps';
import { trpc } from '../../utils/trpc';

export const getServerSideProps = createGetServerSideProps('admin');

export default function AdminApplicationOverview() {
	const router = useRouter();
	const { data: overview, isLoading } = trpc.admin.application.useQuery();
	const { data: onlineUsers } = trpc.self.onlineUsers.useQuery();

	const { data: onlineSessions } = trpc.admin.onlineSessions.useQuery();

	return (
		<Layout>
			<NextSeo title="Admin Overview" />
			{!isLoading ? (
				<div className="grid gap-y-5">
					<PageTitle>Admin Overview</PageTitle>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 select-none">
						<InfoCard
							color="red"
							icon={<IconAlertTriangle color="white" size={36} />}
							title={`Violations`}
							value={(overview?.violations ?? 0).toString()}
							onClick={() => router.push(`/panel/violations`)}
						/>
						<InfoCard
							color="green"
							icon={<IconLicense color="white" size={36} />}
							title={`Permits`}
							value={(overview?.permits ?? 0).toString()}
							onClick={() => router.push(`/panel/permits`)}
						/>
						<InfoCard
							color="blue"
							icon={<IconUser color="white" size={36} />}
							title={`Users`}
							value={(overview?.users ?? 0).toString()}
							onClick={() => router.push(`/admin/users`)}
						/>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
						<Card
							title="Online Users Timeline Graph"
							className="md:col-span-2"
							classNames={{
								container: 'h-72',
							}}
						>
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart
									width={500}
									height={400}
									data={onlineSessions}
									margin={{
										top: 10,
										right: 30,
										left: 0,
										bottom: 0,
									}}
								>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="date" />
									<YAxis />
									<RechartTooltip />
									<Area
										type="monotone"
										dataKey="Total Online Users"
										stroke="#15803d"
										fill="#15803d"
									/>
								</AreaChart>
							</ResponsiveContainer>
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
						<Card
							title="System Information"
							className="md:col-span-2"
						>
							<p>
								You are running STI eDOS version{' '}
								<Code color="dark">{overview?.version}</Code>{' '}
								with{' '}
								<Code color="dark">
									{overview?.runtime.name}
								</Code>{' '}
								<Code color="dark">
									{overview?.runtime.version}
								</Code>{' '}
								on{' '}
								<Code color="dark">
									{overview?.runtime.platform}
								</Code>{' '}
								<Code color="dark">
									{overview?.runtime.arch}
								</Code>
								.
							</p>
						</Card>
					</div>
				</div>
			) : null}
		</Layout>
	);
}
