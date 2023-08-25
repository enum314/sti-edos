import {
	ActionIcon,
	Avatar,
	Badge,
	Button,
	Loader,
	TextInput,
	Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconEdit, IconSearch } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { MouseEvent, useEffect, useState } from 'react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip as RechartTooltip,
	XAxis,
	YAxis,
} from 'recharts';

import { Card } from '../../../components/Card';
import { PageTitle } from '../../../components/PageTitle';
import { ProfileAvatar } from '../../../components/ProfileAvatar';
import Layout from '../../../modules/Layout';
import { restrictedGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { Permission } from '../../../utils/Constants';
import { RelativeFormat } from '../../../utils/RelativeFormat';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = restrictedGetServerSideProps({
	or: [Permission.PANEL_VIOLATION_MANAGE],
});

export default function PanelViolations() {
	const router = useRouter();

	const [page, setPage] = useState(1);
	const [query, setQuery] = useState<string>('');
	const [debouncedQuery] = useDebouncedValue(query, 500);

	const { data: list, isLoading } = trpc.panel.violations.list.useQuery({
		page,
		query: debouncedQuery,
	});

	const { data: analytics } = trpc.panel.violations.analytics.useQuery();
	const { data: latest } = trpc.panel.violations.latest.useQuery();

	useEffect(() => {
		setPage(1);
	}, [debouncedQuery]);

	return (
		<Layout>
			<NextSeo title="Violation Management" />
			<div className="grid gap-y-5">
				<PageTitle>Violation Management</PageTitle>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
					<Card
						title="Violations Issued Timeline Graph"
						className="md:col-span-2"
						classNames={{
							container: 'h-72',
						}}
					>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								width={500}
								height={400}
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
								<Area
									type="monotone"
									dataKey="Violations issued"
									stroke="#be185d"
									fill="#be185d"
								/>
							</AreaChart>
						</ResponsiveContainer>
					</Card>
					<Card title="Latest Violations">
						<div className="grid gap-y-3">
							{latest?.map((violation) => (
								<div
									key={violation.id}
									className="bg-white p-3 rounded-md gap-5 relative flex items-center"
								>
									<Tooltip.Group
										openDelay={300}
										closeDelay={100}
									>
										<Avatar.Group spacing="sm">
											<Tooltip
												label={violation.violators[0]}
												withArrow
											>
												<ProfileAvatar size="md" dot>
													{
														violation
															.violators[0] as string
													}
												</ProfileAvatar>
											</Tooltip>
											{violation.violators.length > 1 ? (
												<Tooltip
													label={
														violation
															.violators[1] as string
													}
													withArrow
												>
													<ProfileAvatar
														size="md"
														dot
													>
														{
															violation
																.violators[1] as string
														}
													</ProfileAvatar>
												</Tooltip>
											) : null}
											{violation.violators.length > 2 ? (
												<Tooltip
													label={
														violation
															.violators[2] as string
													}
													withArrow
												>
													<ProfileAvatar
														size="md"
														dot
													>
														{
															violation
																.violators[2] as string
														}
													</ProfileAvatar>
												</Tooltip>
											) : null}
											{violation.violators.slice(3)
												.length ? (
												<Tooltip
													withArrow
													label={
														<>
															{violation.violators
																.slice(3)
																.map((x) => (
																	<div
																		key={x}
																	>
																		{x}
																	</div>
																))}
														</>
													}
												>
													<Avatar radius="xl">
														+
														{
															violation.violators.slice(
																3,
															).length
														}
													</Avatar>
												</Tooltip>
											) : null}
										</Avatar.Group>
									</Tooltip.Group>
									<div className="grid gap-y-1 place-items-center">
										<Link
											href={`/violation/${violation.id}`}
											className="font-semibold text-lg text-gray-700"
										>
											<span className="absolute inset-0" />
											<span className="text-gray-800">
												#
											</span>
											{violation.id
												.toString()
												.padStart(5, '0')}
											<p className="text-sm text-gray-600">
												{RelativeFormat(
													violation.createdAt,
												)}
											</p>
										</Link>
									</div>
								</div>
							))}
						</div>
					</Card>
				</div>
				<Card title="Violations">
					<div className="grid gap-y-5">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
							<TextInput
								icon={<IconSearch size={16} />}
								placeholder="Search a violation.."
								autoComplete="off"
								value={query}
								onChange={(event) =>
									setQuery(event.currentTarget.value)
								}
								rightSection={
									isLoading ? <Loader size="1.5rem" /> : null
								}
							/>
							<div className="grid place-items-end">
								<Button
									color="green"
									onClick={() =>
										router.push('/panel/violations/new')
									}
								>
									Create New Violation
								</Button>
							</div>
						</div>
						<div className="grid gap-y-5 h-[618px] select-none">
							<DataTable
								withBorder
								borderRadius="md"
								shadow="md"
								withColumnBorders
								highlightOnHover
								fetching={isLoading}
								page={page}
								recordsPerPage={10}
								onPageChange={(p) => setPage(p)}
								records={list?.data ?? []}
								totalRecords={list?.count ?? 0}
								noRecordsText="No violations found"
								onRowClick={({ id }) => {
									router.push(`/violation/${id}`);
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
										accessor: 'Level',
										title: 'Offense',
										render: ({ level }) => (
											<div className="whitespace-nowrap">
												{level === 'MINOR' ? (
													<Tooltip label="Minor Offense">
														<Badge
															variant="dot"
															color="yellow"
														>
															Minor
														</Badge>
													</Tooltip>
												) : level === 'MAJOR_A' ? (
													<Tooltip label="Major Offense - Category A">
														<Badge
															variant="dot"
															color="red"
														>
															Major (A)
														</Badge>
													</Tooltip>
												) : level === 'MAJOR_B' ? (
													<Tooltip label="Major Offense - Category B">
														<Badge
															variant="dot"
															color="red"
														>
															Major (B)
														</Badge>
													</Tooltip>
												) : level === 'MAJOR_C' ? (
													<Tooltip label="Major Offense - Category C">
														<Badge
															variant="dot"
															color="red"
														>
															Major (C)
														</Badge>
													</Tooltip>
												) : (
													<Tooltip label="Major Offense - Category D">
														<Badge
															variant="dot"
															color="red"
														>
															Major (D)
														</Badge>
													</Tooltip>
												)}
											</div>
										),
									},
									{
										accessor: 'violation',
										title: 'Violation',
										render: ({ name }) => (
											<p className="whitespace-nowrap">
												{name as string}
											</p>
										),
									},
									{
										accessor: 'violators',
										title: 'Violator(s)',
										render: ({ violators }) => (
											<Tooltip.Group
												openDelay={300}
												closeDelay={100}
											>
												<Avatar.Group spacing="sm">
													<Tooltip
														label={violators[0]}
														withArrow
													>
														<ProfileAvatar
															size="md"
															dot
														>
															{
																violators[0] as string
															}
														</ProfileAvatar>
													</Tooltip>
													{violators.length > 1 ? (
														<Tooltip
															label={
																violators[1] as string
															}
															withArrow
														>
															<ProfileAvatar
																size="md"
																dot
															>
																{
																	violators[1] as string
																}
															</ProfileAvatar>
														</Tooltip>
													) : null}
													{violators.length > 2 ? (
														<Tooltip
															label={
																violators[2] as string
															}
															withArrow
														>
															<ProfileAvatar
																size="md"
																dot
															>
																{
																	violators[2] as string
																}
															</ProfileAvatar>
														</Tooltip>
													) : null}
													{violators.slice(3)
														.length ? (
														<Tooltip
															withArrow
															label={
																<>
																	{violators
																		.slice(
																			3,
																		)
																		.map(
																			(
																				x,
																			) => (
																				<div
																					key={
																						x
																					}
																				>
																					{
																						x
																					}
																				</div>
																			),
																		)}
																</>
															}
														>
															<Avatar radius="xl">
																+
																{
																	violators.slice(
																		3,
																	).length
																}
															</Avatar>
														</Tooltip>
													) : null}
												</Avatar.Group>
											</Tooltip.Group>
										),
									},
									{
										accessor: 'issuer',
										title: 'Issuer',
										textAlignment: 'center',
										render: ({ issuer }) => (
											<Tooltip
												label={issuer?.name}
												withArrow
											>
												<ProfileAvatar
													size="md"
													className="mx-auto"
												>
													{issuer?.name as string}
												</ProfileAvatar>
											</Tooltip>
										),
									},
									{
										accessor: 'createdAt',
										title: 'Created At',
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
										render: ({ id }) => (
											<div className="flex justify-center gap-2">
												<Tooltip label="Manage">
													<ActionIcon
														variant="filled"
														color="yellow"
														onClick={(
															ev: MouseEvent,
														) => {
															ev.stopPropagation();
															router.push(
																`/panel/violations/${id}`,
															);
														}}
													>
														<IconEdit size={18} />
													</ActionIcon>
												</Tooltip>
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
