/* eslint-disable @typescript-eslint/no-empty-function */
import { Button, ColorInput, MultiSelect, TextInput } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { openConfirmModal } from '@mantine/modals';
import {
	IconDeviceFloppy,
	IconTrash,
	IconUsers,
	IconUserShield,
} from '@tabler/icons-react';
import { createServerSideHelpers } from '@trpc/react-query/server';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import SuperJSON from 'superjson';
import { z } from 'zod';

import { Card } from '../../../components/Card';
import { InfoCard } from '../../../components/InfoCard';
import Loading from '../../../components/Loading';
import { PageTitle } from '../../../components/PageTitle';
import { HandleTRPCError } from '../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../modules/Layout';
import { createGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { createContext } from '../../../server/context';
import { appRouter } from '../../../server/routers/app';
import { Permission, permissionList } from '../../../utils/Constants';
import { trpc } from '../../../utils/trpc';

function arraysEqual<T>(arr1: T[], arr2: T[]): boolean {
	if (arr1.length !== arr2.length) {
		return false;
	}
	return arr1.every((element, index) => element === arr2[index]);
}

export const getServerSideProps = async (
	ctx: GetServerSidePropsContext<{ roleId: string }>,
) => {
	const results = await createGetServerSideProps('admin')(ctx);

	if ('props' in results) {
		const ssr = createServerSideHelpers({
			router: appRouter,
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			ctx: await createContext(ctx),
			transformer: SuperJSON,
		});

		await ssr.admin.roles.get.prefetch({
			id: ctx.params?.roleId as string,
		});

		return {
			props: {
				...results.props,
				trpcState: ssr.dehydrate(),
			},
		};
	}

	return results;
};

export default function RolesPage() {
	const router = useRouter();
	const utils = trpc.useContext();

	const { data: role } = trpc.admin.roles.get.useQuery({
		id: router.query.roleId as string,
	});

	const form = useForm({
		initialValues: {
			name: role?.name as string,
			color: role?.color as string,
			permissions: role?.permissions as Permission[],
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

	const { data: userCount } = trpc.admin.roles.getUserCount.useQuery({
		id: role?.id as string,
	});

	const mutation = trpc.admin.roles.edit.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				await utils.admin.roles.invalidate();
			},
			message: `Role's settings has been updated!`,
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down updating role settings',
			},
		}),
	});

	const deleteMutation = trpc.admin.roles.delete.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				await router.push('/admin/roles');
			},
			message: `The role has been deleted.`,
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down deleting roles!',
			},
		}),
	});

	return (
		<Layout>
			{role ? (
				<>
					<NextSeo title={`Manage ${role.name}`} />
					<PageTitle>{role.name}</PageTitle>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-5 select-none">
						<InfoCard
							color="green"
							icon={<IconUsers color="white" size={36} />}
							title={`Assigned Users`}
							value={userCount?.toString() ?? '0'}
							onClick={() => {}}
						/>
						<InfoCard
							color="red"
							icon={<IconUserShield color="white" size={36} />}
							title={`Assigned Permissions`}
							value={role.permissions.length.toString()}
							onClick={() => {}}
						/>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
						<Card title="Role Information">
							<div className="grid gap-5">
								<TextInput
									withAsterisk
									label="Role ID"
									description="This is the role's ID that is used for identification throughout the application."
									readOnly
									value={role.id}
								/>
							</div>
						</Card>
						<Card title="Manage Role">
							<div className="grid gap-5">
								<TextInput
									placeholder="Enter role name"
									label="Role Name"
									required
									maxLength={16}
									{...form.getInputProps('name')}
								/>
								<ColorInput
									label="Role Color"
									placeholder="Choose role color"
									required
									format="hex"
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
								className="grid place-items-end mt-5"
								onSubmit={form.onSubmit((values) => {
									if (
										values.name === role.name &&
										values.color === role.color &&
										arraysEqual(
											values.permissions,
											role.permissions as Permission[],
										)
									) {
										return;
									}

									mutation.mutate({
										id: role.id,
										data: values,
									});
								})}
							>
								<div className="grid grid-cols-2 gap-5">
									<Button
										color="red"
										loading={mutation.isLoading}
										leftIcon={<IconTrash />}
										onClick={() => {
											openConfirmModal({
												id: 'delete-role',
												title: 'Role Deletion',
												centered: true,
												children: (
													<p>
														Are you sure you want to
														delete this role?
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
													deleteMutation.mutate({
														id: role.id,
													});
												},
											});
										}}
									>
										Delete Role
									</Button>
									<Button
										color="green"
										loading={mutation.isLoading}
										leftIcon={<IconDeviceFloppy />}
										type="submit"
									>
										Save
									</Button>
								</div>
							</form>
						</Card>
					</div>
				</>
			) : (
				<Loading />
			)}
		</Layout>
	);
}
