import { Badge, Button, Code, TextInput } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { openConfirmModal } from '@mantine/modals';
import { IconEdit, IconMessage, IconTrash } from '@tabler/icons-react';
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

import { Card } from '../../components/Card';
import Loading from '../../components/Loading';
import { PageTitle } from '../../components/PageTitle';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { HandleTRPCError } from '../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../modules/common/HandleTRPCSuccess';
import Layout from '../../modules/Layout';
import { RenderHTML } from '../../modules/renderers/RenderHTML';
import TextParser from '../../modules/renderers/TextParser';
import { restrictedGetServerSideProps } from '../../server/common/createGetServerSideProps';
import { WebSocketEvents } from '../../server/common/websocket';
import { createContext } from '../../server/context';
import { appRouter } from '../../server/routers/app';
import { Permission } from '../../utils/Constants';
import { hasPermission } from '../../utils/hasPermission';
import { prisma } from '../../utils/prisma';
import { RelativeFormat } from '../../utils/RelativeFormat';
import { trpc } from '../../utils/trpc';

export const getServerSideProps = async (
	ctx: GetServerSidePropsContext<{ violationId: string }>,
) => {
	const session = await getSession(ctx);
	const results = await restrictedGetServerSideProps(
		{
			or: [Permission.PANEL_VIOLATION_MANAGE],
		},
		async () => {
			if (!isNaN(Number(ctx.params?.violationId))) {
				const violation = await prisma.violation.findUnique({
					where: {
						id: Number(ctx.params?.violationId),
					},
					select: {
						violators: true,
					},
				});

				return violation
					? violation.violators.includes(
							session?.user?.email as string,
					  )
					: false;
			}

			return false;
		},
	)(ctx);

	if ('props' in results) {
		const ssr = createServerSideHelpers({
			router: appRouter,
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			ctx: await createContext(ctx), // xd
			transformer: superjson,
		});

		await ssr.panel.violations.get.prefetch({
			id: Number(ctx.params?.violationId),
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

export default function ViolationPage() {
	const router = useRouter();
	const session = useSession();
	const { data: role } = trpc.self.role.useQuery();

	const { data: violation } = trpc.panel.violations.get.useQuery({
		id: Number(router.query.violationId) as unknown as number,
	});

	const [files] = useState<
		{
			id: string;
			key: string;
			fileName: string;
			url: string;
		}[]
	>(violation?.attachments ?? []);

	const deleteMutation = trpc.panel.violations.delete.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				router.push('/dashboard');
			},
			message: 'The violation has been deleted!',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down deleting violations so fast',
			},
		}),
	});

	return (
		<Layout>
			{violation ? (
				<>
					<NextSeo
						title={`Violation #${violation.id
							.toString()
							.padStart(5, '0')}`}
					/>
					<div className="grid gap-y-5">
						<PageTitle>{`Violation #${violation.id
							.toString()
							.padStart(5, '0')}`}</PageTitle>

						{hasPermission(
							{
								or: [Permission.PANEL_VIOLATION_MANAGE],
							},
							role,
							session?.data?.user?.isAdmin ?? false,
						) ? (
							<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
								<Button
									color="yellow"
									leftIcon={<IconEdit />}
									onClick={() => {
										router.push(
											`/panel/violations/${violation.id}`,
										);
									}}
								>
									Manage Violation
								</Button>
								<Button
									color="red"
									leftIcon={<IconTrash />}
									onClick={() => {
										openConfirmModal({
											id: 'delete-violtion',
											title: 'Violation Deletion',
											centered: true,
											children: (
												<p>
													Are you sure you want to
													delete this violation?
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
													id: violation.id,
												});
											},
										});
									}}
								>
									Delete Violation
								</Button>
							</div>
						) : null}

						<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
							<Card title="Information">
								<div className="grid gap-5">
									{violation.level === 'MINOR' ? (
										<Badge
											variant="dot"
											color="yellow"
											size="xl"
										>
											Minor Offense
										</Badge>
									) : violation.level === 'MAJOR_A' ? (
										<Badge
											variant="dot"
											color="red"
											size="xl"
										>
											Major Offense - Category A
										</Badge>
									) : violation.level === 'MAJOR_B' ? (
										<Badge
											variant="dot"
											color="red"
											size="xl"
										>
											Major Offense - Category B
										</Badge>
									) : violation.level === 'MAJOR_C' ? (
										<Badge
											variant="dot"
											color="red"
											size="xl"
										>
											Major Offense - Category C
										</Badge>
									) : (
										<Badge
											variant="dot"
											color="red"
											size="xl"
										>
											Major Offense - Category D
										</Badge>
									)}
									<TextInput
										withAsterisk
										readOnly
										label="Violation"
										description="The brief description of the violation."
										value={violation.name}
									/>
									<TextInput
										withAsterisk
										readOnly
										label="Issuer"
										description="The person who issued this violation."
										value={violation.issuer?.name as string}
									/>
									<TextInput
										withAsterisk
										readOnly
										label="Created At"
										description="The date and time this violation was issued."
										value={RelativeFormat(
											violation.createdAt,
										)}
									/>
									<div className="h-[200px] select-none">
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
							<Discussion violationId={violation.id} />
							<Card title="Details" className="md:col-span-2">
								<RenderHTML>{violation.details}</RenderHTML>
							</Card>
							<Card title="Violators">
								<div className="grid gap-2">
									{violation.violators.map((x) => (
										<Violator key={x} email={x} />
									))}
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

function Discussion({ violationId }: { violationId: number }) {
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const messagesRef = useRef<HTMLDivElement>(null);

	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState<
		WebSocketEvents['violationMessage'][0][]
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

	const { data: currentMessages } = trpc.message.violationMessages.useQuery({
		violationId,
	});

	const sender = trpc.message.violationMessageSender.useMutation({
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
			setLoading(false);
		},
	});

	const addMessage = useCallback(
		(incomingMessage: WebSocketEvents['violationMessage'][0]) => {
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

	trpc.message.listenViolation.useSubscription(
		{ violationId },
		{
			onData(incomingMessage) {
				addMessage(incomingMessage);
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
					height: `540px`,
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
						sender.mutate({ violationId, ...values });
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
	message: WebSocketEvents['violationMessage'][0];
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

function Violator({ email }: { email: string }) {
	const { data: user } = trpc.self.userByEmail.useQuery({ email });

	return (
		<div
			key={email}
			className="flex items-center gap-2 bg-white rounded-lg p-1"
		>
			<ProfileAvatar size="md" dot>
				{user ? (user.name as string) : email}
			</ProfileAvatar>
			<Code className="select-text whitespace-nowrap">
				{user ? (user.name as string) : email}
			</Code>
		</div>
	);
}
