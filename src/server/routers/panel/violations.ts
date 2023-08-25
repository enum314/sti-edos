import { z } from 'zod';

import { env } from '../../../env/server';
import { Permission } from '../../../utils/Constants';
import { rateLimit } from '../../middlewares/rateLimit';
import { restrict } from '../../middlewares/restrict';
import { pushNotification } from '../../pushNotification';
import { attachmentUrls } from '../../stores';
import { authProcedure, router } from '../../trpc';

const MAX_LIMIT = 10;

export const violationsRouter = router({
	get: authProcedure
		.input(
			z
				.object({
					id: z.number(),
				})
				.strict(),
		)
		.use(
			restrict<{ id: number }>(
				{
					or: [Permission.PANEL_VIOLATION_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const violation = await ctx.prisma.violation.findUnique(
							{
								where: {
									id: input.id,
								},
								select: {
									violators: true,
								},
							},
						);

						return (
							violation?.violators.includes(
								ctx.session.user?.email as string,
							) ?? false
						);
					}

					return false;
				},
			),
		)
		.query(async ({ ctx, input }) => {
			const violation = await ctx.prisma.violation.findUnique({
				where: {
					id: input.id,
				},
				select: {
					id: true,
					name: true,
					level: true,
					details: true,
					violators: true,
					attachments: true,
					issuer: true,
					messages: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			if (!violation) return null;

			const attachments: {
				id: string;
				key: string;
				fileName: string;
				url: string;
			}[] = [];

			for (const attachment of violation.attachments) {
				const file = await ctx.prisma.file.findUnique({
					where: {
						id: attachment,
					},
				});

				if (file?.Key) {
					const cache = await attachmentUrls.get(file.Key);

					if (cache) {
						attachments.push({
							id: file.id,
							key: file.Key,
							fileName: file.fileName,
							url: cache.value,
						});
					} else {
						const url = await ctx.storage.getSignedUrlPromise(
							'getObject',
							{
								Bucket: env.STORAGE_BUCKET,
								Key: file.Key,
								Expires: 300,
							},
						);

						await attachmentUrls.set(file.Key, { value: url });

						attachments.push({
							id: file.id,
							key: file.Key,
							fileName: file.fileName,
							url,
						});
					}
				}
			}

			return { ...violation, attachments };
		}),
	create: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_VIOLATION_MANAGE],
			}),
		)
		.use(rateLimit('panel.violation.create', { points: 1, duration: 20 }))
		.input(
			z
				.object({
					name: z.string().min(1),
					level: z.enum([
						'MINOR',
						'MAJOR_A',
						'MAJOR_B',
						'MAJOR_C',
						'MAJOR_D',
					] as const),
					details: z.string().max(2048),
					violators: z.string().email().array().min(1),
					attachments: z.string().cuid().array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { name, level, details, violators, attachments } = input;

			const data = await ctx.prisma.violation.create({
				data: {
					name,
					level,
					details,
					violators: violators.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					}),
					attachments: attachments.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					}),
					issuerId: ctx.session.user.id,
				},
			});

			await pushNotification(
				data.violators
					.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					})
					.filter((item) => item !== ctx.session.user.email),
				'You have a new violation!',
				data.name,
				`/violation/${data.id}`,
			);

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'violation.create',
					path: `/violation/${data.id}`,
					message: `Created violation ${data.id}`,
				},
			});

			return data.id;
		}),
	edit: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_VIOLATION_MANAGE],
			}),
		)
		.use(rateLimit('panel.violation.edit', { points: 1, duration: 10 }))
		.input(
			z
				.object({
					id: z.number(),
					name: z.string().min(1),
					level: z.enum([
						'MINOR',
						'MAJOR_A',
						'MAJOR_B',
						'MAJOR_C',
						'MAJOR_D',
					] as const),
					details: z.string().max(2048),
					violators: z.string().email().array().min(1),
					attachments: z.string().cuid().array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, name, level, details, violators, attachments } = input;

			await ctx.prisma.violation.update({
				where: {
					id,
				},
				data: {
					name,
					level,
					details,
					violators: violators.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					}),
					attachments: attachments.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					}),
				},
			});

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'violation.edit',
					path: `/violation/${id}`,
					message: `Edited violation ${id}`,
				},
			});
		}),
	delete: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_VIOLATION_MANAGE],
			}),
		)
		.use(rateLimit('panel.violation.delete', { points: 1, duration: 30 }))
		.input(
			z
				.object({
					id: z.number(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id } = input;

			await ctx.prisma.violation.delete({
				where: {
					id,
				},
			});

			await ctx.prisma.notification.deleteMany({
				where: {
					path: `/violation/${id}`,
				},
			});

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'violation.delete',
					path: `/violation/${id}`,
					message: `Deleted violation ${id}`,
				},
			});
		}),
	list: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_VIOLATION_MANAGE],
			}),
		)
		.input(
			z
				.object({
					page: z.number().positive(),
					query: z.string().optional(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const { page, query } = {
				...input,
				query: input.query?.replace(/(\(|\))/g, '') ?? '',
			};

			const skip = page * MAX_LIMIT - MAX_LIMIT;
			const take = MAX_LIMIT;

			const count = await ctx.prisma.violation.count({
				where: query
					? {
							OR: [
								{
									name: {
										contains: query,
										mode: 'insensitive',
									},
								},
								{
									violators: {
										hasSome: query,
									},
								},
								{
									issuer: {
										name: {
											contains: query,
											mode: 'insensitive',
										},
									},
								},
							],
					  }
					: undefined,
			});

			const data = await ctx.prisma.violation.findMany({
				where: query
					? {
							OR: [
								{
									name: {
										contains: query,
										mode: 'insensitive',
									},
								},
								{
									violators: {
										hasSome: query,
									},
								},
								{
									issuer: {
										name: {
											contains: query,
											mode: 'insensitive',
										},
									},
								},
							],
					  }
					: undefined,
				select: {
					id: true,
					name: true,
					level: true,
					violators: true,
					issuer: {
						select: {
							name: true,
							email: true,
						},
					},
					createdAt: true,
					updatedAt: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take,
			});

			return {
				data,
				pages: Math.ceil(count / MAX_LIMIT),
				count,
			};
		}),
	analytics: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_VIOLATION_MANAGE],
			}),
		)
		.query(async ({ ctx }) => {
			const data = await ctx.prisma.violation.findMany({
				select: {
					createdAt: true,
				},
				orderBy: {
					createdAt: 'asc',
				},
			});

			const dataMap = data.reduce<Record<string, number>>(
				(accumulator, current) => {
					const date = new Date(current.createdAt)
						.toLocaleDateString('en-GB')
						.replace(/\//g, '-');

					if (accumulator[date] !== 0) {
						accumulator[date] += 1;
					} else {
						accumulator[date] = 1;
					}

					return accumulator;
				},
				Object.fromEntries(
					Array.from(
						{
							length: 30,
						},
						(_, i) => [
							new Date(Date.now() - i * 24 * 60 * 60 * 1000)
								.toLocaleDateString('en-GB')
								.replace(/\//g, '-'),
							0,
						],
					),
				),
			);

			const dataArr = Object.entries(dataMap)
				.map(([date, count]) => ({
					date,
					'Violations issued': count,
				}))
				.reverse();

			return dataArr;
		}),
	latest: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_VIOLATION_MANAGE],
			}),
		)
		.query(async ({ ctx }) => {
			const data = await ctx.prisma.violation.findMany({
				select: {
					id: true,
					name: true,
					violators: true,
					createdAt: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				take: 3,
			});

			return data;
		}),
});
