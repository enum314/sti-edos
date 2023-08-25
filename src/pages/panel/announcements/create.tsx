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
import { IconTrash, IconUpload } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { useEffect, useMemo, useState } from 'react';
import { remark } from 'remark';
import html from 'remark-html';
import { z } from 'zod';

import { Card } from '../../../components/Card';
import { PageTitle } from '../../../components/PageTitle';
import { HandleTRPCError } from '../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../modules/Layout';
import { RenderHTML } from '../../../modules/renderers/RenderHTML';
import { restrictedGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { Permission } from '../../../utils/Constants';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = restrictedGetServerSideProps({
	or: [Permission.PANEL_ANNOUNCEMENT_MANAGE],
});

export default function PanelAnnouncementCreate() {
	const router = useRouter();
	const [preview, setPreview] = useState('');

	const form = useForm({
		initialValues: {
			title: '',
			message: '',
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

	const mutation = trpc.panel.announcement.create.useMutation({
		onSuccess: HandleTRPCSuccess({
			callback() {
				form.reset();
			},
			message: 'Your announcement has been created!',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down creating announcements',
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
	>([]);

	const previews = useMemo(() => {
		return [
			...files
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
			<NextSeo title="Create Announcement" />

			<div className="grid gap-y-5">
				<PageTitle>Create Announcement</PageTitle>

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
									withBorder
									minHeight={200}
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
					<Card title="Preview" className="sm:col-span-2" noPadding>
						<ScrollArea style={{ height: 450 }} type="scroll">
							<RenderHTML className="px-5">{preview}</RenderHTML>
							<div className="flex flex-wrap gap-5 p-5">
								{previews}
							</div>
						</ScrollArea>
					</Card>
				</div>
				<form
					className="grid md:place-items-end"
					onSubmit={form.onSubmit((values) => {
						mutation.mutate(
							{
								...values,
								attachments: files.map((x) => x.id),
							},
							{
								onSuccess(id) {
									router.push(`/announcement/${id}`);
								},
							},
						);
					})}
				>
					<Button color="green" type="submit">
						Create Announcement
					</Button>
				</form>
			</div>
		</Layout>
	);
}
