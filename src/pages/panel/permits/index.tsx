import { ActionIcon, Badge, Loader, TextInput, Tooltip } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { openConfirmModal } from '@mantine/modals';
import {
	IconBan,
	IconCircleCheck,
	IconCircleX,
	IconSearch,
	IconTrash,
} from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { MouseEvent, useEffect, useState } from 'react';
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip as RechartTooltip,
	XAxis,
	YAxis,
} from 'recharts';

import { Card } from '../../../components/Card';
import { PageTitle } from '../../../components/PageTitle';
import { ProfileAvatar } from '../../../components/ProfileAvatar';
import { HandleTRPCError } from '../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../modules/Layout';
import { restrictedGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { Permission } from '../../../utils/Constants';
import { RelativeFormat } from '../../../utils/RelativeFormat';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = restrictedGetServerSideProps({
	or: [Permission.PANEL_PERMIT_MANAGE],
});

export default function PanelPermits() {
	const router = useRouter();
	const utils = trpc.useContext();

	const [page, setPage] = useState(1);
	const [query, setQuery] = useState<string>('');
	const [debouncedQuery] = useDebouncedValue(query, 500);

	const { data: list, isLoading } = trpc.panel.permits.list.useQuery({
		page,
		query: debouncedQuery,
	});

	const { data: analytics } = trpc.panel.permits.analytics.useQuery();
	const { data: latest } = trpc.panel.permits.latest.useQuery();

	const deleteMutation = trpc.panel.permits.delete.useMutation({
		onSuccess: HandleTRPCSuccess({
			callback() {
				utils.panel.permits.invalidate();
			},
			message: 'The permit has been deleted.',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS:
					'Hey! slow down deleting permit requests so fast',
			},
		}),
	});

	useEffect(() => {
		setPage(1);
	}, [debouncedQuery]);

	return (
		<Layout>
			<NextSeo title="Permit Management" />
			<div className="grid gap-y-5">
				<PageTitle>Permit Management</PageTitle>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
					<Card
						title="Permits Timeline Graph"
						className="md:col-span-2"
						classNames={{
							container: 'h-72',
						}}
					>
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								width={500}
								height={300}
								data={analytics}
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
								<Legend />
								<Line
									type="monotone"
									dataKey="Approved permits"
									stroke="#16a34a"
								/>
								<Line
									type="monotone"
									dataKey="Rejected permits"
									stroke="#e11d48"
								/>
								<Line
									type="monotone"
									dataKey="Revoked permits"
									stroke="#4b5563"
								/>
							</LineChart>
						</ResponsiveContainer>
					</Card>
					<Card title="Latest Pending Permits">
						<div className="grid gap-y-3">
							{latest?.map((permit) => (
								<div
									key={permit.id}
									className="bg-white p-3 rounded-md grid gap-5 relative"
								>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-5 place-items-start">
										<div className="grid gap-y-1 place-items-center">
											<Link
												href={`/permit/${permit.id}`}
												className="font-semibold text-lg whitespace-nowrap text-gray-700"
											>
												<span className="absolute inset-0" />
												<span className="text-gray-800">
													#
												</span>
												{permit.id
													.toString()
													.padStart(5, '0')}
												<p className="text-sm text-gray-600">
													{RelativeFormat(
														permit.createdAt,
													)}
												</p>
											</Link>
										</div>
										<div className="grid place-items-center mt-1">
											<Tooltip
												label={permit.author?.name}
												withArrow
											>
												<ProfileAvatar size="md">
													{
														permit.author
															?.name as string
													}
												</ProfileAvatar>
											</Tooltip>
										</div>
									</div>
								</div>
							))}
						</div>
					</Card>
				</div>

				<Card title="Permits">
					<div className="grid gap-y-5">
						<div className="grid grid-cols-1 md:grid-cols-2 gap 5 relative">
							<TextInput
								icon={<IconSearch size={16} />}
								placeholder="Search a permit.."
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
						<div className="grid gap-y-5 h-[618px] select-none">
							<DataTable
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
								noRecordsText="No permits found"
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
												<span className="text-gray-800">
													#
												</span>
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
										render: ({
											approval,
											rejection,
											revocation,
										}) => {
											if (approval) {
												if (revocation) {
													return (
														<Tooltip
															label={
																<p>
																	Revoked by{' '}
																	{
																		revocation
																			.author
																			.name
																	}
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
																	{
																		approval
																			.author
																			.name
																	}
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
																{
																	approval
																		.author
																		.name
																}
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
																{
																	rejection
																		.author
																		.name
																}
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
										accessor: 'author',
										title: 'Requested By',
										textAlignment: 'center',
										render: ({ author }) => (
											<Tooltip
												label={author?.name}
												withArrow
											>
												<ProfileAvatar
													size="md"
													className="mx-auto"
												>
													{author?.name as string}
												</ProfileAvatar>
											</Tooltip>
										),
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
										render: ({
											id,
											pending,
											approval,
											revocation,
										}) => (
											<div className="flex justify-center gap-2">
												{pending ? (
													<>
														<Tooltip label="Approve">
															<ActionIcon
																variant="filled"
																color="green"
																onClick={(
																	ev: MouseEvent,
																) => {
																	ev.stopPropagation();
																	router.push(
																		`/panel/permits/${id}/approve`,
																	);
																}}
															>
																<IconCircleCheck
																	size={22}
																/>
															</ActionIcon>
														</Tooltip>
														<Tooltip label="Reject">
															<ActionIcon
																variant="filled"
																color="red"
																onClick={(
																	ev: MouseEvent,
																) => {
																	ev.stopPropagation();
																	router.push(
																		`/panel/permits/${id}/reject`,
																	);
																}}
															>
																<IconCircleX
																	size={22}
																/>
															</ActionIcon>
														</Tooltip>
														<Tooltip label="Delete">
															<ActionIcon
																variant="filled"
																color="dark"
																onClick={(
																	ev: MouseEvent,
																) => {
																	ev.stopPropagation();
																	openConfirmModal(
																		{
																			id: 'delete-permit',
																			title: 'Permit Deletion',
																			centered:
																				true,
																			children:
																				(
																					<p>
																						Are
																						you
																						sure
																						you
																						want
																						to
																						delete
																						this
																						permit
																						request?
																					</p>
																				),
																			labels: {
																				confirm:
																					'Yes',
																				cancel: 'No',
																			},
																			overlayProps:
																				{
																					color: 'white',
																					opacity: 0.65,
																					blur: 0.75,
																				},
																			confirmProps:
																				{
																					color: 'red',
																				},
																			onCancel:
																				() =>
																					console.log(
																						'Cancel',
																					),
																			onConfirm:
																				() => {
																					deleteMutation.mutate(
																						{
																							id: id,
																						},
																					);
																				},
																		},
																	);
																}}
															>
																<IconTrash
																	size={18}
																/>
															</ActionIcon>
														</Tooltip>
													</>
												) : approval &&
												  !revocation &&
												  approval.expireAt.getTime() >
														new Date().getTime() ? (
													<Tooltip label="Revoke">
														<ActionIcon
															variant="filled"
															color="red"
															onClick={(
																ev: MouseEvent,
															) => {
																ev.stopPropagation();
																router.push(
																	`/panel/permits/${id}/revoke`,
																);
															}}
														>
															<IconBan
																size={18}
															/>
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
				</Card>
			</div>
		</Layout>
	);
}
