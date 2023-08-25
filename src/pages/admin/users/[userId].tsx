import { Button, Select, TextInput } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import {
	IconAlertTriangle,
	IconDeviceFloppy,
	IconLicense,
	IconLoader,
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
import { RolePill } from '../../../components/RolePill';
import { HandleTRPCError } from '../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../modules/Layout';
import { createGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { createContext } from '../../../server/context';
import { appRouter } from '../../../server/routers/app';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = async (
	ctx: GetServerSidePropsContext<{ userId: string }>,
) => {
	const results = await createGetServerSideProps('admin')(ctx);

	if ('props' in results) {
		const ssr = createServerSideHelpers({
			router: appRouter,
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			ctx: await createContext(ctx), // xd
			transformer: SuperJSON,
		});

		await ssr.admin.users.get.prefetch({
			id: ctx.params?.userId as string,
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

export default function UserPage() {
	const router = useRouter();
	const utils = trpc.useContext();

	const { data: user } = trpc.admin.users.get.useQuery({
		id: router.query.userId as string,
	});

	const form = useForm({
		initialValues: {
			isAdmin: user?.isAdmin ? 'Yes' : 'No',
			roleId: user?.role?.id ?? null,
		},
		validate: zodResolver(
			z
				.object({
					isAdmin: z.enum(['Yes', 'No']),
					roleId: z.string().nullable(),
				})
				.strict(),
		),
	});

	const { data: roles } = trpc.admin.roles.list.useQuery();

	const mutation = trpc.admin.users.editUser.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				await utils.admin.users.invalidate();
			},
			message: `User's Administrative settings has been updated!`,
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down updating user settings',
			},
		}),
	});

	return (
		<Layout>
			{user ? (
				<>
					<NextSeo title={`Manage ${user.name}`} />
					<PageTitle>Manage User</PageTitle>
					<h2 className="ml-1 text-lg mt-5">{user.name}</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-5 select-none">
						<InfoCard
							color="red"
							icon={<IconAlertTriangle color="white" size={36} />}
							title={`Violations`}
							value={user.violations.toString()}
							onClick={() => {
								/** */
							}}
						/>
						<InfoCard
							color="green"
							icon={<IconLicense color="white" size={36} />}
							title={`Active Permits`}
							value={user.activePermits.toString()}
							onClick={() => {
								/** */
							}}
						/>
						<InfoCard
							color="blue"
							icon={<IconLoader color="white" size={36} />}
							title={`Pending Permit Requests`}
							value={user.pendingPermits.toString()}
							onClick={() => {
								/** */
							}}
						/>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
						<Card title="General">
							<div className="grid gap-5">
								<TextInput
									withAsterisk
									label="Account ID"
									readOnly
									value={user.id}
								/>
								<TextInput
									withAsterisk
									label="Account Name"
									readOnly
									value={user.name ?? ''}
								/>
								<TextInput
									withAsterisk
									label="Email Address"
									readOnly
									value={user.email ?? ''}
								/>
							</div>
						</Card>
						<Card title="Manage User Account">
							<div className="grid gap-5">
								<Select
									required
									label="Admin Account"
									data={[
										{
											value: 'Yes',
											label: 'Yes',
										},
										{
											value: 'No',
											label: 'No',
										},
									]}
									value={form.values.isAdmin}
									onChange={(value) =>
										form.setFieldValue(
											'isAdmin',
											value as string,
										)
									}
								/>
								<Select
									required
									label="User Role"
									data={
										[
											{
												id: '',
												name: 'None',
												value: '',
												color: 'gray',
											},
											...(roles ?? []),
										].map((role) => ({
											value: role.id,
											label: role.name,
											color: role.color,
										})) ?? []
									}
									itemComponent={RolePill}
									{...form.getInputProps('roleId')}
								/>
							</div>
							<form
								className="grid place-items-end mt-5"
								onSubmit={form.onSubmit((values) => {
									if (
										(form.values.isAdmin === 'Yes'
											? true
											: false) === user?.isAdmin &&
										form.values.roleId === user?.roleId
									) {
										return;
									}

									mutation.mutate({
										id: user.id,
										isAdmin:
											values.isAdmin === 'Yes'
												? true
												: false,
										roleId:
											values.roleId === ''
												? null
												: values.roleId,
									});
								})}
							>
								<Button
									color="green"
									loading={mutation.isLoading}
									leftIcon={<IconDeviceFloppy />}
									type="submit"
								>
									Save
								</Button>
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
