import { Badge, Button, Textarea, TextInput } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { openConfirmModal } from '@mantine/modals';
import {
	IconBan,
	IconCircleCheck,
	IconCircleX,
	IconEdit,
	IconMessage,
	IconTrash,
} from '@tabler/icons-react';
import { createServerSideHelpers } from '@trpc/react-query/server';
import { DataTable } from 'mantine-datatable';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { getSession, useSession } from 'next-auth/react';
import { NextSeo } from 'next-seo';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import superjson from 'superjson';
import { z } from 'zod';

import { Card } from '../../../components/Card';
import Loading from '../../../components/Loading';
import { PageTitle } from '../../../components/PageTitle';
import { ProfileAvatar } from '../../../components/ProfileAvatar';
import { HandleTRPCError } from '../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../modules/Layout';
import { RenderHTML } from '../../../modules/renderers/RenderHTML';
import TextParser from '../../../modules/renderers/TextParser';
import { restrictedGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { WebSocketEvents } from '../../../server/common/websocket';
import { createContext } from '../../../server/context';
import { appRouter } from '../../../server/routers/app';
import { Permission } from '../../../utils/Constants';
import { hasPermission } from '../../../utils/hasPermission';
import { prisma } from '../../../utils/prisma';
import { RelativeFormat } from '../../../utils/RelativeFormat';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = async (
	ctx: GetServerSidePropsContext<{ permitId: string }>,
) => {
	const session = await getSession(ctx);
	const results = await restrictedGetServerSideProps(
		{
			or: [Permission.PANEL_PERMIT_MANAGE],
		},
		async () => {
			if (!isNaN(Number(ctx.params?.permitId))) {
				const permit = await prisma.permit.findUnique({
					where: {
						id: Number(ctx.params?.permitId),
					},
					select: {
						authorId: true,
					},
				});

				return permit?.authorId === session?.user?.id ?? false;
			}

			return false;
		},
	)(ctx);

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

export default function PermitPage() {
	const router = useRouter();
	const session = useSession();
	const { data: role } = trpc.self.role.useQuery();

	const { data: permit } = trpc.panel.permits.get.useQuery({
		id: Number(router.query.permitId) as unknown as number,
	});

	const [files] = useState<
		{
			id: string;
			key: string;
			fileName: string;
			url: string;
		}[]
	>(permit?.attachments ?? []);

	const deleteMutation = trpc.panel.permits.delete.useMutation({
		onSuccess: HandleTRPCSuccess({
			callback() {
				router.push('/dashboard');
			},
			message: 'The permit has been deleted.',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down deleting permit requests!',
			},
		}),
	});

	return (
		<Layout>
			{permit ? (
				<>
					<NextSeo
						title={`Permit #${permit.id
							.toString()
							.padStart(5, '0')}`}
					/>
					<div className="grid gap-y-5">
						<PageTitle>{`Permit #${permit.id
							.toString()
							.padStart(5, '0')}`}</PageTitle>

						{permit.pending ||
						(permit.approval && !permit.revocation) ? (
							<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
								{permit.pending ? (
									<>
										{hasPermission(
											{
												or: [
													Permission.PANEL_PERMIT_MANAGE,
												],
											},
											role,
											session?.data?.user?.isAdmin ??
												false,
										) ? (
											<>
												<Button
													color="green"
													leftIcon={
														<IconCircleCheck />
													}
													onClick={() => {
														router.push(
															`/panel/permits/${permit.id}/approve`,
														);
													}}
												>
													Approve Permit
												</Button>
												<Button
													color="red"
													leftIcon={<IconCircleX />}
													onClick={() => {
														router.push(
															`/panel/permits/${permit.id}/reject`,
														);
													}}
												>
													Reject Permit
												</Button>
											</>
										) : null}
										{permit.author.email ===
										session?.data?.user?.email ? (
											<Button
												color="yellow"
												leftIcon={<IconEdit />}
												onClick={() => {
													router.push(
														`/permit/${permit.id}/edit`,
													);
												}}
											>
												Edit Permit Request
											</Button>
										) : null}
										<Button
											color="dark"
											leftIcon={<IconTrash />}
											onClick={() => {
												openConfirmModal({
													id: 'delete-permit',
													title: 'Permit Deletion',
													centered: true,
													children: (
														<p>
															Are you sure you
															want to delete this
															permit request?
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
													confirmProps: {
														color: 'red',
													},
													onCancel: () =>
														console.log('Cancel'),
													onConfirm: () => {
														deleteMutation.mutate({
															id: permit.id,
														});
													},
												});
											}}
										>
											Delete Permit Request
										</Button>
									</>
								) : null}

								{permit.approval &&
								!permit.revocation &&
								hasPermission(
									{
										or: [Permission.PANEL_PERMIT_MANAGE],
									},
									role,
									session?.data?.user?.isAdmin ?? false,
								) ? (
									<Button
										color="red"
										leftIcon={<IconBan />}
										onClick={() => {
											router.push(
												`/panel/permits/${permit.id}/revoke`,
											);
										}}
									>
										Revoke Permit
									</Button>
								) : null}
							</div>
						) : null}

						<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
							<Card title="Information">
								<div className="grid gap-5 relative">
									<TextInput
										withAsterisk
										readOnly
										label="Permit"
										description="The brief description of the permit."
										value={permit.name}
									/>
									<TextInput
										withAsterisk
										readOnly
										label="Author"
										description="The person who requested this permit."
										value={permit.author.name as string}
									/>
									<TextInput
										withAsterisk
										readOnly
										label="Requested At"
										description="The date and time this permit was requested."
										value={RelativeFormat(permit.createdAt)}
									/>
									<div className="h-[200px] select-none relative">
										<DataTable
											withBorder
											borderRadius="md"
											shadow="md"
											highlightOnHover
											columns={[
												{
													accessor: 'fileName',
													title: 'Attachments',
													render: ({ fileName }) => (
														<span>
															{fileName.length >
															16
																? `${fileName.slice(
																		0,
																		8,
																  )}...${fileName.slice(
																		fileName.length -
																			8,
																  )}`
																: fileName}
														</span>
													),
												},
											]}
											records={files}
											noRecordsText="No attachments"
											onRowClick={({ url }) => {
												window.open(url);
											}}
										/>
									</div>
								</div>
							</Card>
							<Discussion permitId={permit.id} />
							<Card title="Details" className="md:col-span-2">
								<RenderHTML>{permit.details}</RenderHTML>
							</Card>
							<Card title="Permit Status">
								<div className="grid gap-y-5">
									<div className="grid place-items-center">
										<StatusBadge
											approval={permit.approval}
											rejection={permit.rejection}
											revocation={permit.revocation}
										/>
									</div>
									{permit.approval && !permit.revocation ? (
										<>
											<TextInput
												withAsterisk
												readOnly
												label="Approved By"
												description="The person who approved this permit request."
												value={
													permit.approval.author
														.name as string
												}
											/>
											<TextInput
												withAsterisk
												readOnly
												label="Approved At"
												description="The date and time this permit request was approved."
												value={RelativeFormat(
													permit.approval.createdAt,
												)}
											/>
											<TextInput
												withAsterisk
												readOnly
												label="Valid Until"
												description="The date and time this permit is gonna expire."
												value={RelativeFormat(
													permit.approval.expireAt,
												)}
											/>
											<Textarea
												withAsterisk
												readOnly
												label="Approval Comment"
												description="The approver's comment about the permit request's approval."
												value={
													permit.approval.comment ??
													''
												}
											/>
										</>
									) : null}
									{permit.approval && permit.revocation ? (
										<>
											<TextInput
												withAsterisk
												readOnly
												label="Revoked By"
												description="The person who revoked this permit."
												value={
													permit.revocation.author
														.name as string
												}
											/>
											<TextInput
												withAsterisk
												readOnly
												label="Revoked At"
												description="The date and time this permit was revoked."
												value={RelativeFormat(
													permit.revocation.createdAt,
												)}
											/>
											<Textarea
												withAsterisk
												readOnly
												label="Revocation Comment"
												description="The revoker's comment about the revocation."
												value={
													permit.revocation.comment ??
													''
												}
											/>
											<TextInput
												withAsterisk
												readOnly
												label="Approved By"
												description="The person who approved this permit request."
												value={
													permit.approval.author
														.name as string
												}
											/>
											<TextInput
												withAsterisk
												readOnly
												label="Approved At"
												description="The date and time this permit request was approved."
												value={RelativeFormat(
													permit.approval.createdAt,
												)}
											/>
											<TextInput
												withAsterisk
												readOnly
												label="Valid Until"
												description="The date and time this permit is gonna expire."
												value={RelativeFormat(
													permit.approval.expireAt,
												)}
											/>
											<Textarea
												withAsterisk
												readOnly
												label="Approval Comment"
												description="The approver's comment about the permit request's approval."
												value={
													permit.approval.comment ??
													''
												}
											/>
										</>
									) : null}
									{permit.rejection ? (
										<>
											<TextInput
												withAsterisk
												readOnly
												label="Rejected By"
												description="The person who rejected this permit."
												value={
													permit.rejection.author
														.name as string
												}
											/>
											<TextInput
												withAsterisk
												readOnly
												label="Rejected At"
												description="The date and time this permit request was rejected."
												value={RelativeFormat(
													permit.rejection.createdAt,
												)}
											/>
											<Textarea
												withAsterisk
												readOnly
												label="Rejection Comment"
												description="The rejector's comment about the permit request's rejection."
												value={
													permit.rejection.comment ??
													''
												}
											/>
										</>
									) : null}
								</div>
							</Card>
						</div>
					</div>
				</>
			) : (
				<Loading />
			)}
		</Layout>
	);
}

function Discussion({ permitId }: { permitId: number }) {
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const messagesRef = useRef<HTMLDivElement>(null);

	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState<
		WebSocketEvents['permitMessage'][0][]
	>([]);

	const form = useForm({
		initialValues: {
			content: '',
		},
		validate: zodResolver(
			z
				.object({
					content: z
						.string()
						.min(1, 'Message should not be empty')
						.max(100),
				})
				.strict(),
		),
	});

	const { data: currentMessages } = trpc.message.permitMessages.useQuery({
		permitId,
	});

	const sender = trpc.message.permitMessageSender.useMutation({
		onMutate() {
			setLoading(true);
			form.reset();
		},
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down sending messages',
			},
		}),
		onSettled() {
			scroll();
			setLoading(false);
		},
	});

	const addMessage = useCallback(
		(incomingMessage: WebSocketEvents['permitMessage'][0]) => {
			setMessages((current) => {
				const msgs = current.filter(
					({ id }) => id !== incomingMessage.id,
				);

				msgs.push(incomingMessage);

				return msgs.sort(
					(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
				);
			});
		},
		[],
	);

	trpc.message.listenPermit.useSubscription(
		{ permitId },
		{
			onData(incomingMessage) {
				addMessage(incomingMessage);
				scroll();
			},
			onError(err) {
				console.error('Subscription error:', err);
			},
		},
	);

	useEffect(() => {
		if (currentMessages) {
			for (const message of currentMessages) {
				addMessage(message);
			}
		}
	}, [addMessage, currentMessages]);

	useLayoutEffect(() => {
		messagesContainerRef?.current?.scrollTo({
			top: messagesContainerRef?.current?.scrollHeight ?? undefined,
			behavior: 'smooth',
		});
	}, [messages]);

	return (
		<Card title="Discussion" className="md:col-span-2 relative" noPadding>
			<div
				className="p-2 flex flex-col space-y-2 pb-0"
				style={{
					height: `485px`,
					overflow: 'auto',
				}}
				ref={messagesContainerRef}
			>
				{messages.map((message) => (
					<MessageComponent key={message.id} message={message} />
				))}
				<div ref={messagesRef}></div>
			</div>
			<form
				onSubmit={form.onSubmit((values) => {
					if (!loading) {
						sender.mutate({ permitId, ...values });
					}
				})}
				className="sm:absolute bottom-0 left-0 right-0 border-t border-b p-2 border-gray-300 grid place-items-center"
			>
				<TextInput
					className="w-full"
					placeholder="Type a message..."
					type="text"
					autoComplete="off"
					maxLength={100}
					icon={<IconMessage size="1.3rem" />}
					{...form.getInputProps('content')}
				/>
			</form>
		</Card>
	);
}

function MessageComponent({
	message,
}: {
	message: WebSocketEvents['permitMessage'][0];
}) {
	return (
		<div className="flex select-none bg-white rounded-lg items-center px-2 py-1 mt-auto">
			<ProfileAvatar size="md">{message.author}</ProfileAvatar>
			<div className="ml-5">
				<h3 className="text-base text-gray-800 select-text">
					{message.author}{' '}
					<span className="text-xs text-gray-500 block sm:inline select-none">
						{RelativeFormat(message.createdAt)}
					</span>
				</h3>
				<p className="text-sm text-gray-600 select-text">
					<TextParser>{message.content}</TextParser>
				</p>
			</div>
		</div>
	);
}

function StatusBadge({
	approval,
	rejection,
	revocation,
}: {
	approval: {
		createdAt: Date;
		author: {
			name: string | null;
			email: string | null;
		};
		expireAt: Date;
	} | null;
	rejection: {
		createdAt: Date;
		author: {
			name: string | null;
			email: string | null;
		};
	} | null;
	revocation: {
		createdAt: Date;
		author: {
			name: string | null;
			email: string | null;
		};
	} | null;
}) {
	if (approval) {
		if (revocation) {
			return (
				<Badge color="gray" size="lg" variant="dot">
					Revoked
				</Badge>
			);
		}

		if (approval.expireAt.getTime() < new Date().getTime()) {
			return (
				<Badge color="yellow" size="lg" variant="dot">
					Expired
				</Badge>
			);
		}

		return (
			<Badge color="green" size="lg" variant="dot">
				Active
			</Badge>
		);
	}

	if (rejection) {
		return (
			<Badge color="red" size="lg" variant="dot">
				Rejected
			</Badge>
		);
	}

	return (
		<Badge color="indigo" size="lg" variant="dot">
			Pending
		</Badge>
	);
}
