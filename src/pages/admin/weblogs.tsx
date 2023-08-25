import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { useState } from 'react';

import { PageTitle } from '../../components/PageTitle';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import Layout from '../../modules/Layout';
import { createGetServerSideProps } from '../../server/common/createGetServerSideProps';
import { RelativeFormat } from '../../utils/RelativeFormat';
import { trpc } from '../../utils/trpc';

export const getServerSideProps = createGetServerSideProps('admin');

export default function AdminWeblogs() {
	const router = useRouter();
	const [page, setPage] = useState(1);
	const { data: list, isLoading } = trpc.admin.webActions.useQuery({ page });

	return (
		<Layout>
			<NextSeo title="Website Logs" />
			<div className="grid gap-y-5">
				<PageTitle>Website Logs</PageTitle>

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
					noRecordsText="There are no website logs"
					onRowClick={({ path }) => {
						router.push(path);
					}}
					columns={[
						{
							accessor: 'user',
							title: 'User',
							render: ({ user }) => (
								<div className="flex gap-x-4 items-center whitespace-nowrap">
									<ProfileAvatar size="md">
										{user.name as string}
									</ProfileAvatar>
									<p className="font-semibold tracking-wide">
										{user.name}
									</p>
								</div>
							),
						},
						{
							accessor: 'action',
							title: 'Action',
							render: ({ action }) => (
								<p className="font-normal tracking-wide font-mono bg-gray-100 rounded-sm w-max px-2 py-1 whitespace-nowrap">
									{action}
								</p>
							),
						},
						{
							accessor: 'message',
							title: 'Message',
							render: ({ message }) => (
								<p className="font-normal tracking-wide whitespace-nowrap">
									{message}
								</p>
							),
						},
						{
							accessor: 'createdAt',
							title: 'Created At',
							textAlignment: 'center',
							render: ({ createdAt }) => (
								<p className="font-normal tracking-wide whitespace-nowrap">
									{RelativeFormat(createdAt)}
								</p>
							),
						},
					]}
				/>
			</div>
		</Layout>
	);
}
