import {
	Avatar,
	Button,
	Code,
	ColorInput,
	MultiSelect,
	TextInput,
	Tooltip,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { z } from 'zod';

import { Card } from '../../../components/Card';
import { PageTitle } from '../../../components/PageTitle';
import { ProfileAvatar } from '../../../components/ProfileAvatar';
import { RolePill } from '../../../components/RolePill';
import { HandleTRPCError } from '../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../modules/Layout';
import { createGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { Permission, permissionList } from '../../../utils/Constants';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = createGetServerSideProps('admin');

export default function RolesPage() {
	const router = useRouter();
	const utils = trpc.useContext();

	const { data: list, isLoading } = trpc.admin.roles.list.useQuery();

	const form = useForm({
		initialValues: {
			name: '',
			color: '#fa5252',
			permissions: [],
		},
		validate: zodResolver(
			z
				.object({
					name: z
						.string()
						.min(
							3,
							'Role name should be at least 3 characters long',
						)
						.max(16),
					color: z.string().min(4).max(9).regex(/^#/),
					permissions: z.nativeEnum(Permission).array(),
				})
				.strict(),
		),
	});

	const mutation = trpc.admin.roles.create.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				await utils.admin.roles.invalidate();
				form.reset();
			},
			message: `A new role has been added!`,
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: `Hey! slow down creating roles`,
			},
		}),
	});

	return (
		<Layout>
			<NextSeo title="Role Management" />
			<div className="grid gap-y-5">
				<PageTitle>Role Management</PageTitle>

				<Card title="Roles">
					<div className="grid gap-y-5">
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 relative">
							<TextInput
								required
								placeholder="Enter role name"
								label="Role Name"
								maxLength={16}
								{...form.getInputProps('name')}
							/>
							<ColorInput
								required
								label="Role Color"
								placeholder="Choose role color"
								format="hex"
								withEyeDropper={false}
								swatches={[
									'#25262b',
									'#868e96',
									'#fa5252',
									'#e64980',
									'#be4bdb',
									'#7950f2',
									'#4c6ef5',
									'#228be6',
									'#15aabf',
									'#12b886',
									'#40c057',
									'#82c91e',
									'#fab005',
									'#fd7e14',
								]}
								{...form.getInputProps('color')}
							/>
							<MultiSelect
								data={permissionList}
								searchable
								required
								label="Role Permissions"
								placeholder="Select Permissions"
								{...form.getInputProps('permissions')}
							/>
						</div>
						<form
							className="grid md:place-items-end"
							onSubmit={form.onSubmit((values) => {
								mutation.mutate(values, {
									onSuccess(id) {
										router.push(`/admin/roles/${id}`);
									},
								});
							})}
						>
							<Button
								color="green"
								loading={mutation.isLoading}
								type="submit"
							>
								Create New Role
							</Button>
						</form>
						<div className="grid select-none">
							<DataTable
								minHeight={450}
								withBorder
								borderRadius="md"
								shadow="md"
								highlightOnHover
								className="min-h-[300px]"
								fetching={isLoading}
								records={list ?? []}
								noRecordsText="No roles found"
								onRowClick={({ id }) => {
									router.push(`/admin/roles/${id}`);
								}}
								columns={[
									{
										accessor: 'role',
										title: 'Role',
										render: ({ name, color }) => (
											<RolePill
												label={name}
												color={color}
											/>
										),
									},
									{
										accessor: 'color',
										title: 'Hex Color',
										render: ({ color }) => (
											<Code>{color.toUpperCase()}</Code>
										),
									},
									{
										accessor: 'users',
										title: 'Assigned Users',
										render: ({ users }) => (
											<Tooltip.Group
												openDelay={300}
												closeDelay={100}
											>
												<Avatar.Group spacing="sm">
													{users.length ? (
														<Tooltip
															label={
																users[0].name
															}
															withArrow
														>
															<ProfileAvatar
																size="md"
																dot
															>
																{
																	users[0]
																		.name as string
																}
															</ProfileAvatar>
														</Tooltip>
													) : null}
													{users.length > 1 ? (
														<Tooltip
															label={
																users[1]
																	.name as string
															}
															withArrow
														>
															<ProfileAvatar
																size="md"
																dot
															>
																{
																	users[1]
																		.name as string
																}
															</ProfileAvatar>
														</Tooltip>
													) : null}
													{users.length > 2 ? (
														<Tooltip
															label={
																users[2]
																	.name as string
															}
															withArrow
														>
															<ProfileAvatar
																size="md"
																dot
															>
																{
																	users[2]
																		.name as string
																}
															</ProfileAvatar>
														</Tooltip>
													) : null}
													{users.slice(3).length ? (
														<Tooltip
															withArrow
															label={
																<>
																	{users
																		.slice(
																			3,
																		)
																		.map(
																			(
																				x,
																			) => (
																				<div
																					key={
																						x.name
																					}
																				>
																					{
																						x.name
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
																	users.slice(
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
										accessor: 'permissions',
										title: 'Assigned Permissions',
										textAlignment: 'center',
										render: ({ permissions }) =>
											permissions.length ? (
												<Avatar radius="xl" mx="auto">
													{permissions.length}
												</Avatar>
											) : (
												<Avatar radius="xl" mx="auto">
													0
												</Avatar>
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
