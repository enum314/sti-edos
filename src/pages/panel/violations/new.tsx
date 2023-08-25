import {
	ActionIcon,
	Badge,
	Button,
	FileButton,
	Loader,
	MultiSelect,
	Select,
	Tooltip,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
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

import { Card } from '../../../components/Card';
import { SelectUser } from '../../../components/forms/SelectUser';
import { PageTitle } from '../../../components/PageTitle';
import { HandleTRPCError } from '../../../modules/common/HandleTRPCError';
import { HandleTRPCSuccess } from '../../../modules/common/HandleTRPCSuccess';
import Layout from '../../../modules/Layout';
import { restrictedGetServerSideProps } from '../../../server/common/createGetServerSideProps';
import { Permission, ViolationTypes } from '../../../utils/Constants';
import { trpc } from '../../../utils/trpc';

export const getServerSideProps = restrictedGetServerSideProps({
	or: [Permission.PANEL_VIOLATION_MANAGE],
});

export default function PanelViolations() {
	const router = useRouter();

	const [searchValue, onSearchChange] = useState('');
	const [query] = useDebouncedValue(searchValue, 300);

	const { data: users, isLoading } = trpc.panel.users.useQuery({
		query: query ?? undefined,
	});

	const [level, setLevel] = useState<
		'MINOR' | 'MAJOR_A' | 'MAJOR_B' | 'MAJOR_C' | 'MAJOR_D'
	>('MINOR');

	const [data, setData] = useState<{ label?: string; value: string }[]>([]);

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
			violators: [],
		},
		validate: zodResolver(
			z
				.object({
					name: z.string().min(1, 'Please select a violation'),
					violators: z
						.string()
						.email('This field should only contain email addresses')
						.array()
						.min(1, 'This field should contain a violator or more'),
				})
				.strict(),
		),
	});

	const mutation = trpc.panel.violations.create.useMutation({
		onSuccess: HandleTRPCSuccess({
			callback() {
				form.reset();
			},
			message: 'The violation has been issued!',
		}),
		onError: HandleTRPCError({
			messages: {
				TOO_MANY_REQUESTS: 'Hey! slow down issuing violations',
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
		const violation = ViolationTypes.find(
			(x) => x.value === form.values.name,
		);

		if (violation) {
			if (violation.group.endsWith('A')) {
				setLevel('MAJOR_A');
			} else if (violation.group.endsWith('B')) {
				setLevel('MAJOR_B');
			} else if (violation.group.endsWith('C')) {
				setLevel('MAJOR_C');
			} else if (violation.group.endsWith('D')) {
				setLevel('MAJOR_D');
			} else {
				setLevel('MINOR');
			}
		}
	}, [form.values.name]);

	useEffect(() => {
		if (file) {
			upload.mutate({ fileName: file.name, type: file.type });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [file]);

	useEffect(() => {
		if (users) {
			setData(
				[
					...form.values.violators.map((x) => ({
						label: x,
						value: x,
					})),
					...users.map(({ name, email }) => ({
						label: name as string,
						value: email as string,
					})),
				].filter((item, index, self) => {
					return (
						index ===
						self.findIndex(
							(t) =>
								t.label === item.label &&
								t.value === item.value,
						)
					);
				}),
			);
		}
	}, [form.values.violators, users]);

	return (
		<Layout>
			<NextSeo title="New Violation" />

			<div className="grid gap-y-5">
				<PageTitle>New Violation</PageTitle>
				<div className="grid gap-5 grid-cols-1 md:grid-cols-2">
					<Card className="md:col-span-2" title="Basic Information">
						<div className="grid gap-5">
							<Select
								required
								label="Offense"
								placeholder="Select offense"
								description="Describe the type of the violation."
								searchable
								nothingFound="Violation not found"
								data={ViolationTypes}
								maxDropdownHeight={280}
								{...form.getInputProps('name')}
							/>
							<div className="grid place-items-center">
								{level === 'MINOR' ? (
									<Badge
										variant="dot"
										color="yellow"
										size="xl"
									>
										Minor Offense
									</Badge>
								) : level === 'MAJOR_A' ? (
									<Badge variant="dot" color="red" size="xl">
										Major Offense - Category A
									</Badge>
								) : level === 'MAJOR_B' ? (
									<Badge variant="dot" color="red" size="xl">
										Major Offense - Category B
									</Badge>
								) : level === 'MAJOR_C' ? (
									<Badge variant="dot" color="red" size="xl">
										Major Offense - Category C
									</Badge>
								) : (
									<Badge variant="dot" color="red" size="xl">
										Major Offense - Category D
									</Badge>
								)}
							</div>
							<MultiSelect
								required
								label="Violator(s)"
								placeholder="Select user(s)"
								description="The violator(s) who are/is involved"
								itemComponent={SelectUser}
								searchable
								searchValue={searchValue}
								onSearchChange={onSearchChange}
								creatable
								getCreateLabel={(query) =>
									`+ ${query.replace(
										/ +/g,
										'',
									)}@fairview.sti.edu.ph`
								}
								data={data}
								rightSection={
									isLoading ? <Loader size="1.5rem" /> : null
								}
								onCreate={(query) => {
									const item = {
										label: `${query.replace(
											/ +/g,
											'',
										)}@fairview.sti.edu.ph`,
										value: `${query.replace(
											/ +/g,
											'',
										)}@fairview.sti.edu.ph`,
									};
									setData((current) => [...current, item]);
									return item;
								}}
								{...form.getInputProps('violators')}
							/>
						</div>
					</Card>
					<Card
						title="Additional Information (Optional)"
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
								level,
								details: editor?.getHTML() ?? '',
								attachments: files.map((x) => x.id),
							},
							{
								onSuccess(id) {
									router.push(`/violation/${id}`);
								},
							},
						);
					})}
				>
					<Button color="green" type="submit">
						Create Violation
					</Button>
				</form>
			</div>
		</Layout>
	);
}
