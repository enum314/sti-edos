import { Badge, Loader, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { useEffect, useState } from 'react';

import { Card } from '../../../components/Card';
import { PageTitle } from '../../../components/PageTitle';
import { ProfileAvatar } from '../../../components/ProfileAvatar';
import Layout from '../../../modules/Layout';
import { restrictedGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { Permission } from '../../../utils/Constants';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = restrictedGetServerSideProps({
	or: [Permission.PANEL_USER_PROFILES_VIEW],
});

export default function UserProfiles() {
	const router = useRouter();

	const [page, setPage] = useState(1);

	const [query, setQuery] = useState<string>('');
	const [debouncedQuery] = useDebouncedValue(query, 500);

	const { data: list, isLoading } = trpc.profiles.useQuery({
		page,
		query: debouncedQuery,
	});

	const { data: onlineUsers } = trpc.self.onlineUsers.useQuery();

	useEffect(() => {
		setPage(1);
	}, [debouncedQuery]);

	return (
		<Layout>
			<NextSeo title="User Profiles" />
			<div className="grid gap-y-5">
				<PageTitle>User Profiles</PageTitle>
				<Card title="Users">
					<div className="grid gap-y-5">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
							<TextInput
								icon={<IconSearch size={16} />}
								placeholder="Search a user by name..."
								autoComplete="off"
								value={query}
								onChange={(event) =>
									setQuery(event.currentTarget.value)
								}
								rightSection={
									isLoading ? <Loader size="1.5rem" /> : null
								}
							/>
						</div>
						<div className="grid select-none">
							<DataTable
								minHeight={450}
								withBorder
								borderRadius="md"
								shadow="md"
								highlightOnHover
								page={page}
								recordsPerPage={10}
								onPageChange={(p) => setPage(p)}
								records={list?.data ?? []}
								totalRecords={list?.count ?? 0}
								fetching={isLoading}
								noRecordsText={`No users found`}
								onRowClick={({ id }) => {
									router.push(`/profile/${id}`);
								}}
								columns={[
									{
										accessor: 'online',
										title: 'Status',
										textAlignment: 'center',
										render: ({ email }) => (
											<div className="flex items-center justify-center">
												{onlineUsers?.find(
													(u) =>
														u.email ===
															email?.toLowerCase() ??
														'',
												) ? (
													<Badge
														color="green"
														size="lg"
														variant="outline"
													>
														Online
													</Badge>
												) : (
													<Badge
														color="gray"
														size="lg"
														variant="outline"
													>
														Offline
													</Badge>
												)}
											</div>
										),
									},
									{
										accessor: 'id',
										title: 'User',
										render: ({ name }) => (
											<div className="flex gap-x-4 items-center whitespace-nowrap">
												<ProfileAvatar size="md">
													{name as string}
												</ProfileAvatar>
												<p className="font-semibold tracking-wide">
													{name}
												</p>
											</div>
										),
									},
									{
										accessor: 'email',
										title: 'Email Address',
										render: ({ email }) => (
											<p className="font-semibold tracking-wide">
												{email}
											</p>
										),
									},
								]}
							/>
						</div>
					</div>
				</Card>
			</div>
		</Layout>
	);
}
