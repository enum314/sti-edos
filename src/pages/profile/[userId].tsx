import { Avatar, Badge, Button, Tooltip } from '@mantine/core';
import { openConfirmModal } from '@mantine/modals';
import {
	IconAlertTriangle,
	IconBell,
	IconLicense,
	IconLoader,
	IconThumbDown,
} from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { getSession, useSession } from 'next-auth/react';
import { NextSeo } from 'next-seo';

import { InfoCard } from '../../components/InfoCard';
import { PageTitle } from '../../components/PageTitle';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { HandleTRPCError } from '../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../modules/common/HandleTRPCSuccess';
import Layout from '../../modules/Layout';
import { restrictedGetServerSideProps } from '../../server/common/createGetServerSideProps';
import { Permission } from '../../utils/Constants';
import { hasPermission } from '../../utils/hasPermission';
import { RelativeFormat } from '../../utils/RelativeFormat';
import { trpc } from '../../utils/trpc';

export const getServerSideProps = async (
	ctx: GetServerSidePropsContext<{ userId: string }>,
) => {
	const session = await getSession(ctx);
	const results = await restrictedGetServerSideProps(
		{
			or: [Permission.PANEL_USER_PROFILES_VIEW],
		},
		async () => {
			if (ctx.params?.userId) {
				return session?.user?.id === ctx.params?.userId;
			}

			return false;
		},
	)(ctx);

	return results;
};

export default function Profile() {
	const router = useRouter();
	const session = useSession();

	const { data: role } = trpc.self.role.useQuery();

	const { data: profile } = trpc.profile.useQuery({
		id: router.query.userId as unknown as string,
	});

	const mutation = trpc.panel.notify.useMutation({
		onSuccess: HandleTRPCSuccess({
			message: 'Successfully notified the user!',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down a bit!',
			},
		}),
	});

	return (
		<Layout>
			{profile ? (
				<>
					<NextSeo title={profile.user.name ?? 'Profile'} />
					<div className="grid gap-y-5">
						<PageTitle>{profile.user.name}</PageTitle>
						{hasPermission(
							{
								or: [Permission.PANEL_USER_PROFILES_VIEW],
							},
							role,
							session?.data?.user?.isAdmin ?? false,
						) ? (
							<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
								<Button
									color="green"
									leftIcon={<IconBell />}
									onClick={() => {
										openConfirmModal({
											id: 'notify',
											title: 'Notify for Disciplinary Office Presence',
											centered: true,
											children: (
												<p>
													Are you sure you want to
													notify {profile.user.name}{' '}
													for disciplinary office
													presence?
												</p>
											),
											labels: {
												confirm: 'Yes',
												cancel: 'No',
											},
											overlayProps: {
												color: 'white',
												opacity: 0.65,
												blur: 0.75,
											},
											confirmProps: { color: 'red' },
											onCancel: () =>
												console.log('Cancel'),
											onConfirm: () => {
												mutation.mutate({
													id: router.query
														.userId as unknown as string,
												});
											},
										});
									}}
								>
									Notify User
								</Button>
							</div>
						) : null}
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 select-none">
							<InfoCard
								color="blue"
								icon={
									<IconAlertTriangle
										color="white"
										size={36}
									/>
								}
								title={`Total Violations`}
								value={profile.count.violations.total.toString()}
								onClick={() => {
									/** */
								}}
							/>
							<InfoCard
								color="yellow"
								icon={
									<IconAlertTriangle
										color="white"
										size={36}
									/>
								}
								title={`Minor Violations`}
								value={profile.count.violations.minor.toString()}
								onClick={() => {
									/** */
								}}
							/>

							<Tooltip
								position="bottom"
								label={
									<div>
										<div className="flex flex-col">
											<p className="font-medium">
												Major Offenses - Category A
											</p>
											<p className="ml-2 text-sm text-gray-200">
												{
													profile.count.violations
														.majorA
												}{' '}
												violations
											</p>
										</div>
										<div className="flex flex-col">
											<p className="font-medium">
												Major Offenses - Category B
											</p>
											<p className="ml-2 text-sm text-gray-200">
												{
													profile.count.violations
														.majorB
												}{' '}
												violations
											</p>
										</div>
										<div className="flex flex-col">
											<p className="font-medium">
												Major Offenses - Category C
											</p>
											<p className="ml-2 text-sm text-gray-200">
												{
													profile.count.violations
														.majorC
												}{' '}
												violations
											</p>
										</div>
										<div className="flex flex-col">
											<p className="font-medium">
												Major Offenses - Category D
											</p>
											<p className="ml-2 text-sm text-gray-200">
												{
													profile.count.violations
														.majorD
												}{' '}
												violations
											</p>
										</div>
									</div>
								}
							>
								<div>
									<InfoCard
										color="red"
										icon={
											<IconAlertTriangle
												color="white"
												size={36}
											/>
										}
										title={`Major Violations`}
										value={(
											profile.count.violations.majorA +
											profile.count.violations.majorB +
											profile.count.violations.majorC +
											profile.count.violations.majorD
										).toString()}
										onClick={() => {
											/** */
										}}
									/>
								</div>
							</Tooltip>
						</div>

						<DataTable
							minHeight={450}
							withBorder
							borderRadius="md"
							shadow="md"
							withColumnBorders
							highlightOnHover
							records={profile.violations ?? []}
							noRecordsText="No violations found."
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
														{violators[0] as string}
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
												{violators.slice(3).length ? (
													<Tooltip
														withArrow
														label={
															<>
																{violators
																	.slice(3)
																	.map(
																		(x) => (
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
										<Tooltip label={issuer?.name} withArrow>
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
									title: 'Issued At',
									render: ({ createdAt }) => (
										<p className="whitespace-nowrap">
											{RelativeFormat(createdAt)}
										</p>
									),
								},
							]}
						/>

						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 select-none">
							<InfoCard
								color="green"
								icon={<IconLicense color="white" size={36} />}
								title={`Active Permits`}
								value={profile.count.activePermits.toString()}
								onClick={() => {
									/** */
								}}
							/>
							<InfoCard
								color="blue"
								icon={<IconLoader color="white" size={36} />}
								title={`Pending Permits`}
								value={profile.count.pendingPermits.toString()}
								onClick={() => {
									/** */
								}}
							/>
							<InfoCard
								color="red"
								icon={<IconThumbDown color="white" size={36} />}
								title={`Rejected Permits`}
								value={profile.count.rejectedPermits.toString()}
								onClick={() => {
									/** */
								}}
							/>
						</div>
						<DataTable
							minHeight={450}
							withBorder
							borderRadius="md"
							shadow="md"
							withColumnBorders
							highlightOnHover
							records={profile.permits ?? []}
							noRecordsText="No permits found."
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
																approval.author
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
																rejection.author
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
									accessor: 'createdAt',
									title: 'Requested At',
									render: ({ createdAt }) => (
										<p className="whitespace-nowrap">
											{RelativeFormat(createdAt)}
										</p>
									),
								},
							]}
						/>
					</div>
				</>
			) : null}
		</Layout>
	);
}
