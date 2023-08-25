import { ActionIcon, Button, FileButton, Select, Tooltip } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { openConfirmModal } from '@mantine/modals';
import { RichTextEditor } from '@mantine/tiptap';
import {
	IconDeviceFloppy,
	IconEye,
	IconTrash,
	IconUpload,
} from '@tabler/icons-react';
import CharacterCount from '@tiptap/extension-character-count';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { createServerSideHelpers } from '@trpc/react-query/server';
import { DataTable } from 'mantine-datatable';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { NextSeo } from 'next-seo';
import { useEffect, useState } from 'react';
import superjson from 'superjson';
import { z } from 'zod';

import { Card } from '../../../components/Card';
import { PageTitle } from '../../../components/PageTitle';
import { HandleTRPCError } from '../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../modules/Layout';
import { restrictedGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { createContext } from '../../../server/context';
import { appRouter } from '../../../server/routers/app';
import { Permission, PermitTypes } from '../../../utils/Constants';
import { prisma } from '../../../utils/prisma';
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
						pending: true,
					},
				});

				if (!permit?.pending) {
					return false;
				}

				return permit?.authorId === session?.user?.id;
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

export default function EditPermitPage() {
	const router = useRouter();
	const utils = trpc.useContext();

	const { data: permit } = trpc.panel.permits.get.useQuery({
		id: Number(router.query.permitId) as unknown as number,
	});

	const editor = useEditor({
		extensions: [StarterKit, CharacterCount.configure({ limit: 2048 })],
		content: permit?.details ?? '',
	});

	const form = useForm({
		initialValues: {
			name: permit?.name ?? '',
		},
		validate: zodResolver(
			z
				.object({
					name: z.string(),
				})
				.strict(),
		),
	});

	const mutation = trpc.panel.permits.edit.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				await utils.panel.permits.invalidate();
			},
			message: 'This permit request has been updated!',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS:
					'Hey! slow down updating this permit request so fast',
			},
		}),
	});

	const deleteMutation = trpc.panel.permits.delete.useMutation({
		onSuccess: HandleTRPCSuccess({
			async callback() {
				await utils.panel.permits.invalidate();
				router.push('/dashboard');
			},
			message: 'The permit request has been deleted!',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS:
					'Hey! slow down deleting permit requests so fast',
			},
		}),
	});

	const [file, setFile] = useState<File | null>(null);
	const [files, setFiles] = useState<
		{
			id: string;
			key: string;
			fileName: string;
			url: string | null;
		}[]
	>(permit?.attachments ?? []);

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
						url: null,
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
			{permit ? (
				<>
					<NextSeo
						title={`Permit #${permit.id
							.toString()
							.padStart(5, '0')}`}
					/>

					<div className="grid gap-y-5">
						<PageTitle>
							Editing Permit Request #
							{permit.id.toString().padStart(5, '0')}
						</PageTitle>

						<div className="grid gap-5 grid-cols-1 md:grid-cols-2">
							<Card title="Basic Information">
								<div className="grid gap-5">
									<Select
										required
										label="Permit"
										placeholder="Pick permit"
										description="Describe the type of the permit."
										searchable
										nothingFound="Permit not found"
										data={PermitTypes}
										{...form.getInputProps('name')}
									/>
								</div>
							</Card>

							<Card
								title="Permit Details"
								className="min-h-[350px] md:col-span-2"
							>
								<RichTextEditor editor={editor}>
									<RichTextEditor.Toolbar>
										<RichTextEditor.ControlsGroup>
											<RichTextEditor.Bold />
											<RichTextEditor.Italic />
											<RichTextEditor.Strikethrough />
											<RichTextEditor.ClearFormatting />
											<RichTextEditor.Code />
										</RichTextEditor.ControlsGroup>

										<RichTextEditor.ControlsGroup>
											<RichTextEditor.H1 />
											<RichTextEditor.H2 />
											<RichTextEditor.H3 />
											<RichTextEditor.H4 />
										</RichTextEditor.ControlsGroup>

										<RichTextEditor.ControlsGroup>
											<RichTextEditor.Blockquote />
											<RichTextEditor.Hr />
											<RichTextEditor.BulletList />
											<RichTextEditor.OrderedList />
										</RichTextEditor.ControlsGroup>
									</RichTextEditor.Toolbar>
									<RichTextEditor.Content />
								</RichTextEditor>
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
															)?.url ? (
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
																				f?.url
																			) {
																				window.open(
																					f.url,
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
						</div>
						<div className="grid md:place-items-end">
							<form
								className="grid grid-cols-2 gap-5"
								onSubmit={form.onSubmit((values) => {
									mutation.mutate({
										id: permit.id,
										...values,
										details: editor?.getHTML() ?? '',
										attachments: files.map((x) => x.id),
									});
								})}
							>
								<Button
									color="red"
									leftIcon={<IconTrash />}
									onClick={() => {
										openConfirmModal({
											id: 'delete-permit',
											title: 'Permit Deletion',
											centered: true,
											children: (
												<p>
													Are you sure you want to
													delete this permit request?
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
									Delete Permit
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
