import {
	ActionIcon,
	Button,
	FileButton,
	Image,
	ScrollArea,
	Textarea,
	Tooltip,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { openConfirmModal } from '@mantine/modals';
import {
	IconDeviceFloppy,
	IconEye,
	IconTrash,
	IconUpload,
} from '@tabler/icons-react';
import { createServerSideHelpers } from '@trpc/react-query/server';
import { DataTable } from 'mantine-datatable';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { useEffect, useMemo, useState } from 'react';
import { remark } from 'remark';
import html from 'remark-html';
import superjson from 'superjson';
import { z } from 'zod';

import { Card } from '../../../components/Card';
import { PageTitle } from '../../../components/PageTitle';
import { HandleTRPCError } from '../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../modules/Layout';
import { RenderHTML } from '../../../modules/renderers/RenderHTML';
import { restrictedGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { createContext } from '../../../server/context';
import { appRouter } from '../../../server/routers/app';
import { Permission } from '../../../utils/Constants';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = async (
	ctx: GetServerSidePropsContext<{ announcementId: string }>,
) => {
	const results = await restrictedGetServerSideProps({
		or: [Permission.PANEL_ANNOUNCEMENT_MANAGE],
	})(ctx);

	if ('props' in results) {
		const ssr = createServerSideHelpers({
			router: appRouter,
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			ctx: await createContext(ctx),
			transformer: superjson,
		});

		await ssr.announcement.get.prefetch({
			id: ctx.params?.announcementId as string,
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

export default function EditAnnouncement() {
	const router = useRouter();
	const [preview, setPreview] = useState('');

	const { data: announcement } = trpc.announcement.get.useQuery({
		id: router.query.announcementId as string,
	});

	const form = useForm({
		initialValues: {
			title: announcement?.title ?? '',
			message: announcement?.message ?? '',
		},
		validate: zodResolver(
			z

				.object({
					title: z.string().min(1, 'Please enter a title'),
					message: z
						.string()
						.min(1, 'Please enter a message')
						.max(
							8192,
							'Message cannot be longer than 8192 characters',
						),
				})
				.strict(),
		),
	});

	const [debouncedMessage] = useDebouncedValue(form.values.message, 500);

	useEffect(() => {
		if (debouncedMessage) {
			remark()
				.use(html)
				.process(debouncedMessage)
				.then((c) => setPreview(c.toString()));
		}
	}, [debouncedMessage]);

	const mutation = trpc.panel.announcement.edit.useMutation({
		onSuccess: HandleTRPCSuccess({
			callback() {
				form.reset();
			},
			message: 'Your announcement has been edited',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down editing this announcement',
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

	const [file, setFile] = useState<File | null>(null);
	const [files, setFiles] = useState<
		{
			id: string;
			key: string;
			fileName: string;
			preview: string | undefined;
		}[]
	>(announcement?.attachments.map((x) => ({ ...x, preview: x.url })) ?? []);

	const previews = useMemo(() => {
		return [
			...files
				.filter(
					(file) =>
						file.fileName.endsWith('.png') ||
						file.fileName.endsWith('.jpg') ||
						file.fileName.endsWith('.jpeg') ||
						file.fileName.endsWith('.webp'),
				)
				.filter((x) => x.preview)
				.map((file) => (
					<Image
						key={file.id}
						src={file.preview}
						alt={file.fileName}
						height={156}
						width={156}
					/>
				)),
		];
	}, [files]);

	const upload = trpc.self.upload.useMutation({
		onSuccess: async (output) => {
			if (!file || !output) {
				return;
			}

			const formData = new FormData();

			const { id, key, signed } = output;

			const data = {
				...signed.fields,
				'Content-Type': file.type,
				file: file,
				fileName: file.name,
			};

			for (const name in data) {
				formData.append(name, data[name as keyof typeof data]);
			}

			await fetch(signed.url, {
				method: 'POST',
				body: formData,
			}).then(() => {
				setFiles((current) => [
					...current,
					{
						id,
						key,
						fileName: file.name,
						preview: file.type.startsWith('image/')
							? URL.createObjectURL(file)
							: undefined,
					},
				]);
			});
		},
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down uploading files',
			},
		}),
		onSettled: () => {
			setFile(null);
		},
	});

	useEffect(() => {
		if (file) {
			upload.mutate({ fileName: file.name, type: file.type });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [file]);

	return (
		<Layout>
			{announcement ? (
				<>
					<NextSeo title={announcement.title} />

					<div className="grid gap-y-5">
						<PageTitle>Announcement Editing</PageTitle>

						<div className="grid gap-5 grid-cols-1 md:grid-cols-3">
							<Card title="Title">
								<Textarea
									placeholder="Enter title"
									label="Announcement Title"
									description="This will be displayed in the announcement list"
									withAsterisk
									{...form.getInputProps('title')}
								/>
							</Card>
							<Card title="Message" className="md:col-span-2">
								<Textarea
									placeholder="Enter message"
									label="Announcement Message"
									description="Also supports markdown!"
									withAsterisk
									autosize
									minRows={5}
									maxRows={10}
									{...form.getInputProps('message')}
								/>
							</Card>

							<Card title="Attachments (Optional)">
								<div className="grid gap-y-5">
									<div className="select-none">
										<DataTable
											minHeight={200}
											withBorder
											borderRadius="md"
											shadow="md"
											highlightOnHover
											columns={[
												{
													accessor: 'fileName',
													title: 'File Name',
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
												{
													accessor: 'path',
													title: 'Action',
													textAlignment: 'center',
													render: ({ key }) => (
														<div className="flex justify-center gap-2">
															{files.find(
																(x) =>
																	x.key ===
																	key,
															)?.preview ? (
																<Tooltip label="View">
																	<ActionIcon
																		variant="filled"
																		color="green"
																		onClick={() => {
																			const f =
																				files.find(
																					(
																						x,
																					) =>
																						x.key ===
																						key,
																				);

																			if (
																				f?.preview
																			) {
																				window.open(
																					f.preview,
																				);
																			}
																		}}
																	>
																		<IconEye
																			size={
																				18
																			}
																		/>
																	</ActionIcon>
																</Tooltip>
															) : null}

															<Tooltip label="Remove">
																<ActionIcon
																	variant="filled"
																	color="red"
																	onClick={() => {
																		setFiles(
																			files.filter(
																				(
																					x,
																				) =>
																					x.key !==
																					key,
																			),
																		);
																	}}
																>
																	<IconTrash
																		size={
																			18
																		}
																	/>
																</ActionIcon>
															</Tooltip>
														</div>
													),
												},
											]}
											records={files}
											noRecordsText="No attachments to upload"
										/>
									</div>
									<FileButton
										onChange={(f) => {
											if (f) {
												setFile(f);
											}
										}}
										accept="image/png,image/jpeg,application/pdf"
									>
										{(props) => (
											<Button
												leftIcon={<IconUpload />}
												{...props}
											>
												Upload an Image or PDF
											</Button>
										)}
									</FileButton>
								</div>
							</Card>
							<Card
								title="Preview"
								className="sm:col-span-2"
								noPadding
							>
								<ScrollArea
									style={{ height: 450 }}
									type="scroll"
								>
									<RenderHTML className="px-5">
										{preview}
									</RenderHTML>
									<div className="flex flex-wrap gap-5 p-5">
										{previews}
									</div>
								</ScrollArea>
							</Card>
						</div>
						<div className="grid md:place-items-end">
							<form
								className="grid grid-cols-2 gap-5"
								onSubmit={form.onSubmit((values) => {
									mutation.mutate({
										id: announcement.id,
										...values,
										attachments: files.map((x) => x.id),
									});
								})}
							>
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
													Are you sure you want to
													delete this announcement?
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
								<Button
									color="green"
									type="submit"
									leftIcon={<IconDeviceFloppy />}
								>
									Save
								</Button>
							</form>
						</div>
					</div>
				</>
			) : null}
		</Layout>
	);
}
