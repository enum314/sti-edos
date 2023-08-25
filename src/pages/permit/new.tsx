import { ActionIcon, Button, FileButton, Select, Tooltip } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { RichTextEditor } from '@mantine/tiptap';
import { IconTrash, IconUpload } from '@tabler/icons-react';
import CharacterCount from '@tiptap/extension-character-count';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { Card } from '../../components/Card';
import { PageTitle } from '../../components/PageTitle';
import { HandleTRPCError } from '../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../modules/common/HandleTRPCSuccess';
import Layout from '../../modules/Layout';
import { createGetServerSideProps } from '../../server/common/createGetServerSideProps';
import { PermitTypes } from '../../utils/Constants';
import { trpc } from '../../utils/trpc';

export const getServerSideProps = createGetServerSideProps('user');

export default function NewPermitRequest() {
	const router = useRouter();

	const editor = useEditor({
		extensions: [
			StarterKit,
			CharacterCount.configure({
				limit: 2048,
			}),
		],
		content: '',
	});

	const form = useForm({
		initialValues: {
			name: '',
		},
		validate: zodResolver(
			z
				.object({
					name: z.string().min(1, 'Please select a permit type'),
				})
				.strict(),
		),
	});

	const mutation = trpc.panel.permits.request.useMutation({
		onSuccess: HandleTRPCSuccess({
			callback() {
				form.reset();
			},
			message: 'Your new permit has been requested!',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down requesting permits',
			},
		}),
	});

	const [file, setFile] = useState<File | null>(null);
	const [files, setFiles] = useState<
		{ id: string; key: string; fileName: string }[]
	>([]);

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
			<NextSeo title="New Permit Request" />

			<div className="grid gap-y-5">
				<PageTitle>New Permit Request</PageTitle>

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
							<div className="h-[200px] select-none">
								<DataTable
									withBorder
									borderRadius="md"
									shadow="md"
									highlightOnHover
									columns={[
										{
											accessor: 'fileName',
											title: 'File Name',
										},
										{
											accessor: 'path',
											title: 'Action',
											textAlignment: 'center',
											render: ({ key }) => (
												<div className="flex justify-center gap-2">
													<Tooltip label="Remove">
														<ActionIcon
															variant="filled"
															color="red"
															onClick={() => {
																setFiles(
																	files.filter(
																		(x) =>
																			x.key !==
																			key,
																	),
																);
															}}
														>
															<IconTrash
																size={18}
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
				<form
					className="grid place-items-end"
					onSubmit={form.onSubmit((values) => {
						mutation.mutate(
							{
								...values,
								details: editor?.getHTML() ?? '',
								attachments: files.map((x) => x.id),
							},
							{
								onSuccess(id) {
									router.push(`/permit/${id}`);
								},
							},
						);
					})}
				>
					<Button color="green" type="submit">
						Send Permit Request
					</Button>
				</form>
			</div>
		</Layout>
	);
}
