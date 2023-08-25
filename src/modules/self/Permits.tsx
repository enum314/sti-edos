import { ActionIcon, Badge, Button, Tooltip } from '@mantine/core';
import { IconEdit, IconLicense } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { MouseEvent, useState } from 'react';

import { RelativeFormat } from '../../utils/RelativeFormat';
import { trpc } from '../../utils/trpc';

export function Permits() {
	const router = useRouter();

	const [page, setPage] = useState(1);

	const { data: list, isLoading } = trpc.self.permits.useQuery({
		page,
		MAX_LIMIT: 10,
	});

	return (
		<div className="grid gap-y-5 select-none">
			<div className="grid grid-cols-1 md:grid-cols-2">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
					<Button
						color="green"
						onClick={() => router.push('/permit/new')}
						leftIcon={<IconLicense size={18} />}
					>
						Request New Permit
					</Button>
				</div>
			</div>
			<div className={`grid gap-y-5 select-none`}>
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
					onPageChange={(p) => setPage(p)}
					records={list?.data ?? []}
					totalRecords={list?.count ?? 0}
					noRecordsText="You have no permits"
					onRowClick={({ id }) => {
						router.push(`/permit/${id}`);
					}}
					columns={[
						{
							accessor: 'id',
							title: 'ID',
							textAlignment: 'center',
							render: ({ id }) => (
								<p className="font-semibold text-lg whitespace-nowrap text-gray-700">
									<span className="text-gray-800">#</span>
									{id.toString().padStart(5, '0')}
								</p>
							),
						},
						{
							accessor: 'name',
							title: 'Permit',
							render: ({ name }) => (
								<p className="whitespace-nowrap">
									{name as string}
								</p>
							),
						},
						{
							accessor: 'pending',
							title: 'Status',
							textAlignment: 'center',
							render: ({ approval, rejection, revocation }) => {
								if (approval) {
									if (revocation) {
										return (
											<Tooltip
												label={
													<p>
														Revoked by{' '}
														{revocation.author.name}
														<br />
														{RelativeFormat(
															revocation.createdAt,
														)}
													</p>
												}
											>
												<Badge
													color="gray"
													size="lg"
													variant="outline"
												>
													Revoked
												</Badge>
											</Tooltip>
										);
									}

									if (
										approval.expireAt.getTime() <
										new Date().getTime()
									) {
										return (
											<Tooltip
												label={
													<p>
														Approved by{' '}
														{approval.author.name}
														<br />
														{RelativeFormat(
															approval.createdAt,
														)}
														<br />
														Until{' '}
														{RelativeFormat(
															approval.expireAt,
														)}{' '}
														{'('}expired
														{')'}
													</p>
												}
											>
												<Badge
													color="yellow"
													size="lg"
													variant="outline"
												>
													Expired
												</Badge>
											</Tooltip>
										);
									}

									return (
										<Tooltip
											label={
												<p>
													Approved by{' '}
													{approval.author.name}
													<br />
													{RelativeFormat(
														approval.createdAt,
													)}
													<br />
													Until{' '}
													{RelativeFormat(
														approval.expireAt,
													)}
												</p>
											}
										>
											<Badge
												color="green"
												size="lg"
												variant="outline"
											>
												Active
											</Badge>
										</Tooltip>
									);
								}

								if (rejection) {
									return (
										<Tooltip
											label={
												<p>
													Rejected by{' '}
													{rejection.author.name}
													<br />
													{RelativeFormat(
														rejection.createdAt,
													)}
												</p>
											}
										>
											<Badge
												color="red"
												size="lg"
												variant="outline"
											>
												Rejected
											</Badge>
										</Tooltip>
									);
								}

								return (
									<Badge
										color="indigo"
										size="lg"
										variant="outline"
									>
										Pending
									</Badge>
								);
							},
						},
						{
							accessor: 'createdAt',
							title: 'Requested At',
							render: ({ createdAt }) => (
								<p className="whitespace-nowrap">
									{RelativeFormat(createdAt)}
								</p>
							),
						},
						{
							accessor: 'actions',
							title: 'Actions',
							textAlignment: 'center',
							render: ({ id, pending }) => (
								<div className="flex justify-center gap-2">
									{pending ? (
										<Tooltip label="Edit">
											<ActionIcon
												variant="filled"
												color="yellow"
												onClick={(ev: MouseEvent) => {
													ev.stopPropagation();
													router.push(
														`/permit/${id}/edit`,
													);
												}}
											>
												<IconEdit size={18} />
											</ActionIcon>
										</Tooltip>
									) : null}
								</div>
							),
						},
					]}
				/>
			</div>
		</div>
	);
}
