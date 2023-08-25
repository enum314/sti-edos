import { Button, Textarea } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { createServerSideHelpers } from '@trpc/react-query/server';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import superjson from 'superjson';
import { z } from 'zod';

import { Card } from '../../../../components/Card';
import { PageTitle } from '../../../../components/PageTitle';
import { HandleTRPCError } from '../../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../../modules/Layout';
import { restrictedGetServerSideProps } from '../../../../server/common/createGetServerSideProps';
import { createContext } from '../../../../server/context';
import { appRouter } from '../../../../server/routers/app';
import { Permission } from '../../../../utils/Constants';
import { trpc } from '../../../../utils/trpc';

export const getServerSideProps = async (
	ctx: GetServerSidePropsContext<{ permitId: string }>,
) => {
	const results = await restrictedGetServerSideProps({
		or: [Permission.PANEL_PERMIT_MANAGE],
	})(ctx);

	if ('props' in results) {
		const ssr = createServerSideHelpers({
			router: appRouter,
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			ctx: await createContext(ctx),
			transformer: superjson,
		});

		await ssr.panel.permits.get.prefetch({
			id: Number(ctx.params?.permitId),
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

export default function RejectPermit() {
	const router = useRouter();

	const { data: permit } = trpc.panel.permits.get.useQuery({
		id: Number(router.query.permitId) as unknown as number,
	});

	const form = useForm({
		initialValues: {
			comment: '',
		},
		validate: zodResolver(
			z
				.object({
					comment: z.string().max(196),
				})
				.strict(),
		),
	});

	const mutation = trpc.panel.permits.reject.useMutation({
		onSuccess: HandleTRPCSuccess({
			callback() {
				router.back();
			},
			message: `The permit has been rejected.`,
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down rejecting permits so fast',
			},
		}),
	});

	return (
		<Layout>
			<NextSeo title="Permit Rejection" />
			<div className="grid gap-y-5">
				{permit ? (
					<>
						<PageTitle>{`Permit Rejection for #${permit?.id
							.toString()
							.padStart(5, '0')}`}</PageTitle>

						<div className="grid grid-cols-1 md:grid-cols-2">
							<Card title="Rejection Form">
								<div className="grid gap-y-5">
									<Textarea
										label="Comment"
										description="A brief description about the permit rejection."
										placeholder="Write a comment..."
										maxLength={196}
										{...form.getInputProps('comment')}
									/>
								</div>
								<form
									onSubmit={form.onSubmit((values) => {
										mutation.mutate({
											permitId: permit.id,
											...values,
										});
									})}
									className="grid place-items-end mt-5"
								>
									<Button color="red" type="submit">
										Reject Permit
									</Button>
								</form>
							</Card>
						</div>
					</>
				) : null}
			</div>
		</Layout>
	);
}
