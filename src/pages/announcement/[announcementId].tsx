import {
	//  ActionIcon,
	Button,
	Image,
	Menu,
	Rating,
	Textarea,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { openConfirmModal } from '@mantine/modals';
import {
	// IconDots,
	IconEdit,
	IconMessageDots,
	IconThumbUp,
	IconThumbUpFilled,
	IconTrash,
} from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { NextSeo } from 'next-seo';
import { useEffect, useMemo, useState } from 'react';
import { remark } from 'remark';
import html from 'remark-html';
import { z } from 'zod';

import { ProfileAvatar } from '../../components/ProfileAvatar';
import { HandleTRPCError } from '../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../modules/common/HandleTRPCSuccess';
import Layout from '../../modules/Layout';
import { RenderHTML } from '../../modules/renderers/RenderHTML';
import { createGetServerSideProps } from '../../server/common/createGetServerSideProps';
import { Permission } from '../../utils/Constants';
import { hasPermission } from '../../utils/hasPermission';
import { RelativeFormat } from '../../utils/RelativeFormat';
import { trpc } from '../../utils/trpc';

export const getServerSideProps = createGetServerSideProps('user');

export default function ViewAnnouncement() {
	const utils = trpc.useContext();
	const router = useRouter();
	const session = useSession();

	const { data: role } = trpc.self.role.useQuery();

	const { data: announcement } = trpc.announcement.get.useQuery({
		id: router.query.announcementId as unknown as string,
	});

	const previews = useMemo(() => {
		return announcement?.attachments
			? announcement.attachments
					.filter(
						(file) =>
							file.fileName.endsWith('.png') ||
							file.fileName.endsWith('.jpg') ||
							file.fileName.endsWith('.jpeg') ||
							file.fileName.endsWith('.webp'),
					)
					.map((file) => (
						<a
							key={file.id}
							href={file.url}
							target="_blank"
							rel="noreferrer"
						>
							<Image
								src={file.url}
								alt={file.fileName}
								height={156}
								width={156}
							/>
						</a>
					))
			: [];
	}, [announcement?.attachments]);

	const [preview, setPreview] = useState('');

	useEffect(() => {
		if (announcement?.message) {
			remark()
				.use(html)
				.process(announcement?.message)
				.then((c) => setPreview(c.toString()));
		}
	}, [announcement?.message]);

	const rate = trpc.announcement.rate.useMutation({
		onSuccess: () => {
			utils.announcement.get.invalidate();
		},
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down rating so fast',
			},
		}),
	});

	const deleteMutation = trpc.panel.announcement.delete.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				router.push('/dashboard');
			},
			message: 'The announcement has been deleted!',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS:
					'Hey! slow down deleting announcements so fast',
			},
		}),
	});

	return (
		<Layout>
			{announcement ? (
				<>
					<NextSeo title={announcement.title} />
					<div className="grid gap-y-5">
						<div className="grid place-items-center gap-5 bg-gray-50 rounded-lg shadow-xl pb-10">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 p-2 bg-white rounded-lg w-full border-b">
								<div className="border-b md:border-b-0 md:border-r flex items-center relative gap-x-5 w-full">
									<ProfileAvatar size="md">
										{announcement.author.name as string}
									</ProfileAvatar>
									<div className="text-sm leading-6">
										<p className="font-semibold text-gray-700">
											<span className="absolute inset-0" />
											{announcement.author.name}
										</p>
										<p className={`text-gray-600`}>
											{announcement.author.role
												? announcement.author.role.name
												: ''}
										</p>
									</div>
								</div>
								<div className="grid place-items-center border-b md:border-b-0 md:border-r">
									<div className="flex items-center gap-x-5">
										<Rating
											value={
												announcement.ratings.reduce(
													(a, b) => a + b.rating,
													0,
												) / announcement.ratings.length
											}
											fractions={2}
											size="md"
											readOnly
										/>
										<p className="text-base text-gray-600">
											{announcement.ratings.reduce(
												(a, b) => a + b.rating,
												0,
											) %
												announcement.ratings.length !==
											0
												? (
														announcement.ratings.reduce(
															(a, b) =>
																a + b.rating,
															0,
														) /
														announcement.ratings
															.length
												  ).toFixed(2)
												: announcement.ratings.reduce(
														(a, b) => a + b.rating,
														0,
												  ) /
												  announcement.ratings.length}
											/5 ({announcement.ratings.length})
										</p>
										<Menu shadow="md" width={200}>
											<Menu.Target>
												<Button
													variant="subtle"
													radius="md"
													size="sm"
												>
													Rate
												</Button>
											</Menu.Target>
											<Menu.Dropdown>
												<Rating
													size="md"
													mx="auto"
													defaultValue={
														announcement.ratings.find(
															(rating) =>
																rating.author
																	.id ===
																session?.data
																	?.user?.id,
														)?.rating ?? 0
													}
													onChange={(value) =>
														rate.mutate({
															id: announcement.id,
															rating: value,
														})
													}
												/>
											</Menu.Dropdown>
										</Menu>
									</div>
								</div>

								{hasPermission(
									{
										or: [
											Permission.PANEL_ANNOUNCEMENT_MANAGE,
										],
									},
									role,
									session?.data?.user?.isAdmin ?? false,
								) ? (
									<div className="grid gap-5 grid-cols-2 mt-2">
										<Button
											color="yellow"
											leftIcon={<IconEdit />}
											onClick={() => {
												router.push(
													`/panel/announcements/${announcement.id}`,
												);
											}}
										>
											Edit
										</Button>
										<Button
											color="red"
											leftIcon={<IconTrash />}
											onClick={() => {
												openConfirmModal({
													id: 'delete-announcement',
													title: 'Announcement Deletion',
													centered: true,
													children: (
														<p>
															Are you sure you
															want to delete this
															announcement?
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
															id: announcement.id,
														});
													},
												});
											}}
										>
											Delete
										</Button>
									</div>
								) : null}
							</div>
							<article className="px-5 md:px-10 w-full">
								{preview ? (
									<>
										<time
											dateTime={announcement.createdAt.toDateString()}
											className="text-gray-500"
										>
											{RelativeFormat(
												announcement.createdAt,
											)}
										</time>
										<h1 className="font-bold text-3xl pb-2 border-b">
											{announcement.title}
										</h1>
										<RenderHTML className="px-3">
											{preview}
										</RenderHTML>
										<div className="flex flex-wrap gap-5 px-3">
											{previews}
										</div>
										<div className="select-none mt-5 px-3">
											{(announcement?.attachments ?? [])
												.length ? (
												<DataTable
													withBorder
													borderRadius="md"
													shadow="md"
													highlightOnHover
													columns={[
														{
															accessor:
																'fileName',
															title: 'Attachments',
															render: ({
																fileName,
															}) => (
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
													records={
														announcement?.attachments ??
														[]
													}
													noRecordsText="No attachments"
													onRowClick={({ url }) => {
														window.open(url);
													}}
												/>
											) : null}
										</div>
									</>
								) : null}
							</article>
						</div>
						<CommentsModule />
					</div>
				</>
			) : null}
		</Layout>
	);
}

function CommentsModule() {
	const utils = trpc.useContext();
	const router = useRouter();
	const session = useSession();

	// const { data: role } = trpc.self.role.useQuery();

	const { data: announcement } = trpc.announcement.get.useQuery({
		id: router.query.announcementId as unknown as string,
	});

	const form = useForm({
		initialValues: {
			message: '',
		},
		validate: zodResolver(
			z
				.object({
					message: z
						.string()
						.min(1, 'Please enter a message.')
						.max(500, 'Message is too long.'),
				})
				.strict(),
		),
	});

	const createComment = trpc.announcement.comment.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				await utils.announcement.get.invalidate();
				form.reset();
			},
			message: 'Your comment has been posted.',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'You are commenting too fast.',
			},
		}),
	});

	const likeComment = trpc.announcement.likeComment.useMutation({
		onSuccess: async () => {
			await utils.announcement.get.invalidate();
		},
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'You are liking too fast.',
			},
		}),
	});

	const comments = useMemo(() => {
		return (
			announcement?.comments
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.sort((a, b) => b.replies.length - a.replies.length)
				.sort((a, b) => b.likes.length - a.likes.length) ?? []
		);
	}, [announcement]);

	const replies = useMemo(() => {
		return comments
			.map((comment) => comment.replies)
			.flat()
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	}, [comments]);

	return (
		<>
			{announcement ? (
				<div className="p-5 md:p-10 pb-5 bg-gray-100 rounded-lg shadow-xl">
					<h2 className="text-lg lg:text-2xl font-bold text-gray-900 mb-5">
						Comments ({announcement.comments.length})
					</h2>
					<form
						className="grid grid-cols-1 gap-y-5 mb-5"
						onSubmit={form.onSubmit((values) => {
							createComment.mutate({
								id: announcement.id,
								message: values.message,
							});
						})}
					>
						<Textarea
							placeholder="Write a comment..."
							size="md"
							maxLength={500}
							autosize
							minRows={3}
							maxRows={6}
							{...form.getInputProps('message')}
						/>
						<div>
							<Button type="submit">Post Comment</Button>
						</div>
					</form>
					<div className="grid grid-cols-1 pt-5 border-t">
						{comments.map((comment) => (
							<article
								key={comment.id}
								id={`comment-${comment.id}`}
								className="p-5 mb-5 text-base bg-white rounded-lg shadow-lg"
							>
								<footer className="flex justify-between items-center mb-2">
									<div className="flex items-center">
										<div className="inline-flex items-center text-gray-900 relative">
											<ProfileAvatar size="md">
												{comment.author.name as string}
											</ProfileAvatar>
											<div className="text-xs md:text-sm leading-6 ml-5">
												<p className="font-semibold text-gray-700">
													<span className="absolute inset-0" />
													{comment.author.name} &bull;{' '}
													<time
														dateTime={comment.createdAt.toISOString()}
														className="text-xs text-gray-500"
													>
														{RelativeFormat(
															comment.createdAt,
														)}
													</time>
												</p>
												<p
													className={`text-gray-600 md:text-xs`}
												>
													{comment.author.role
														? comment.author.role
																.name
														: ''}{' '}
												</p>
											</div>
										</div>
									</div>
									{/* {hasPermission(
										{
											or: [
												Permission.PANEL_ANNOUNCEMENT_MANAGE,
											],
										},
										role,
										session?.data?.user?.isAdmin ?? false,
									) ||
									session?.data?.user?.id ===
										comment.author.id ? (
										<ActionIcon>
											<IconDots size="1.125rem" />
										</ActionIcon>
									) : null} */}
								</footer>
								<p className="text-gray-500 pl-2 pt-2">
									{comment.message}
								</p>
								<div className="flex items-center mt-4 space-x-2">
									<Button
										variant="subtle"
										radius="md"
										size="xs"
										leftIcon={
											comment.likes.find(
												(like) =>
													like.author.id ===
													session?.data?.user?.id,
											) ? (
												<IconThumbUpFilled size="1.125rem" />
											) : (
												<IconThumbUp size="1.125rem" />
											)
										}
										onClick={() => {
											likeComment.mutate({
												id: comment.id,
											});
										}}
									>
										{comment.likes.length}
									</Button>
									<Button
										variant="subtle"
										radius="md"
										size="xs"
										leftIcon={
											<IconMessageDots size="1.125rem" />
										}
									>
										{comment.replies.length}
									</Button>
								</div>
								<RepliesModule
									replies={replies.filter(
										(r) => r.commentId === comment.id,
									)}
									commentId={comment.id}
								/>
							</article>
						))}
					</div>
				</div>
			) : null}
		</>
	);
}

function RepliesModule(props: {
	commentId: string;
	replies: {
		id: string;
		message: string;
		author: {
			role: {
				name: string;
				color: string;
			} | null;
			id: string;
			name: string | null;
			email: string | null;
		};
		createdAt: Date;
		likes: {
			author: {
				role: {
					name: string;
					color: string;
				} | null;
				id: string;
				name: string | null;
				email: string | null;
			};
		}[];
		commentId: string;
	}[];
}) {
	const utils = trpc.useContext();
	const session = useSession();

	// const { data: role } = trpc.self.role.useQuery();

	const form = useForm({
		initialValues: {
			message: '',
		},
		validate: zodResolver(
			z
				.object({
					message: z
						.string()
						.min(1, 'Please enter a message.')
						.max(500, 'Message is too long.'),
				})
				.strict(),
		),
	});

	const createReply = trpc.announcement.replyComment.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				await utils.announcement.get.invalidate();
				form.reset();
			},
			message: 'Your reply has been posted.',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'You are replying too fast.',
			},
		}),
	});

	const likeReply = trpc.announcement.likeReply.useMutation({
		onSuccess: async () => {
			await utils.announcement.get.invalidate();
		},
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'You are liking too fast.',
			},
		}),
	});

	return (
		<>
			<div className="ml-1 md:ml-4 mt-2">
				{props.replies.length > 0
					? props.replies.map((reply) => (
							<article
								key={reply.id}
								id={`comment-${reply.id}`}
								className="p-2 md:p-5 mb-5 text-base bg-gray-100 rounded-lg shadow-inner"
							>
								<footer className="flex justify-between items-center mb-2">
									<div className="flex items-center">
										<div className="inline-flex items-center text-gray-900 relative">
											<ProfileAvatar size="md">
												{reply.author.name as string}
											</ProfileAvatar>
											<div className="text-xs md:text-sm leading-6 ml-5">
												<p className="font-semibold text-gray-700">
													<span className="absolute inset-0" />
													{reply.author.name} &bull;{' '}
													<time
														dateTime={reply.createdAt.toISOString()}
														className="text-xs text-gray-500"
													>
														{RelativeFormat(
															reply.createdAt,
														)}
													</time>
												</p>
												<p
													className={`text-gray-600 text-xs`}
												>
													{reply.author.role
														? reply.author.role.name
														: ''}{' '}
												</p>
											</div>
										</div>
									</div>

									{/* {hasPermission(
										{
											or: [
												Permission.PANEL_ANNOUNCEMENT_MANAGE,
											],
										},
										role,
										session?.data?.user?.isAdmin ?? false,
									) ||
									session?.data?.user?.id ===
										reply.author.id ? (
										<ActionIcon>
											<IconDots size="1.125rem" />
										</ActionIcon>
									) : null} */}
								</footer>
								<p className="text-gray-500 pl-2 pt-2">
									{reply.message}
								</p>
								<div className="flex items-center mt-4 space-x-2">
									<Button
										variant="subtle"
										radius="md"
										size="xs"
										leftIcon={
											reply.likes.find(
												(like) =>
													like.author.id ===
													session?.data?.user?.id,
											) ? (
												<IconThumbUpFilled size="1.125rem" />
											) : (
												<IconThumbUp size="1.125rem" />
											)
										}
										onClick={() => {
											likeReply.mutate({
												id: reply.id,
											});
										}}
									>
										{reply.likes.length}
									</Button>
								</div>
							</article>
					  ))
					: null}
				<form
					onSubmit={form.onSubmit((values) => {
						createReply.mutate({
							id: props.commentId,
							message: values.message,
						});
					})}
					className="flex items-start mt-2"
				>
					<ProfileAvatar size="md">
						{session?.data?.user?.name as string}
					</ProfileAvatar>
					<div className="flex-grow ml-5">
						<Textarea
							placeholder="Write a reply..."
							className="w-full"
							{...form.getInputProps('message')}
						/>
						<div className="flex items-center space-x-2 mt-2">
							<Button
								variant="subtle"
								radius="md"
								size="xs"
								type="submit"
							>
								Reply
							</Button>
						</div>
					</div>
				</form>
			</div>
		</>
	);
}
