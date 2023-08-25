import { z } from 'zod';

import { env } from '../../../env/server';
import { Permission } from '../../../utils/Constants';
import { rateLimit } from '../../middlewares/rateLimit';
import { restrict } from '../../middlewares/restrict';
import { pushNotification } from '../../pushNotification';
import { attachmentUrls } from '../../stores';
import { authProcedure, router } from '../../trpc';

const MAX_LIMIT = 10;

export const permitsRouter = router({
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
					or: [Permission.PANEL_PERMIT_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const permit = await ctx.prisma.permit.findUnique({
							where: {
								id: input.id,
							},
							select: {
								authorId: true,
							},
						});

						return (
							permit?.authorId === ctx.session.user?.id ?? false
						);
					}

					return false;
				},
			),
		)
		.query(async ({ ctx, input }) => {
			const permit = await ctx.prisma.permit.findUnique({
				where: {
					id: input.id,
				},
				select: {
					id: true,
					name: true,
					details: true,
					attachments: true,
					author: {
						select: {
							name: true,
							email: true,
						},
					},
					pending: true,
					approval: {
						select: {
							author: {
								select: {
									name: true,
									email: true,
								},
							},
							comment: true,
							expireAt: true,
							createdAt: true,
						},
					},
					rejection: {
						select: {
							author: {
								select: {
									name: true,
									email: true,
								},
							},
							comment: true,
							createdAt: true,
						},
					},
					revocation: {
						select: {
							author: {
								select: {
									name: true,
									email: true,
								},
							},
							comment: true,
							createdAt: true,
						},
					},
					messages: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			if (!permit) return null;

			const attachments: {
				id: string;
				key: string;
				fileName: string;
				url: string;
			}[] = [];

			for (const attachment of permit.attachments) {
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

			return { ...permit, attachments };
		}),
	request: authProcedure
		.use(rateLimit('user.permit.request', { points: 1, duration: 60 }))
		.input(
			z
				.object({
					name: z.string().min(1),
					details: z.string().max(2048),
					attachments: z.string().cuid().array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { name, details, attachments } = input;

			const data = await ctx.prisma.permit.create({
				data: {
					name,
					details,
					attachments,
					pending: true,
					authorId: ctx.session.user.id,
				},
			});

			const users = await ctx.prisma.user.findMany({
				where: {
					OR: [
						{
							isAdmin: true,
						},
						{
							role: {
								permissions: {
									has: Permission.PANEL_PERMIT_MANAGE,
								},
							},
						},
					],
				},
				select: {
					email: true,
				},
			});

			await pushNotification(
				users
					.map((x) => x.email)
					.filter((x) => x)
					.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					})
					.filter(
						(item) => item !== ctx.session.user.email,
					) as string[],
				'A new permit has been requested',
				data.name,
				`/permit/${data.id}`,
			);

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'permit.request',
					path: `/permit/${data.id}`,
					message: `Requested permit #${data.id
						.toString()
						.padStart(5, '0')}`,
				},
			});

			return data.id;
		}),
	edit: authProcedure
		.use(
			restrict<{ id: number }>({}, async (ctx, input) => {
				if (input) {
					const permit = await ctx.prisma.permit.findUnique({
						where: {
							id: input.id,
						},
						select: {
							authorId: true,
							pending: true,
						},
					});

					if (!permit?.pending) {
						return false;
					}

					return permit?.authorId === ctx.session.user?.id;
				}

				return false;
			}),
		)
		.use(rateLimit('permit.modify', { points: 1, duration: 10 }))
		.input(
			z
				.object({
					id: z.number(),
					name: z.string().min(1),
					details: z.string().max(2048),
					attachments: z.string().cuid().array(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, name, details, attachments } = input;

			await ctx.prisma.permit.update({
				where: {
					id,
				},
				data: {
					name,
					details,
					attachments: attachments.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					}),
				},
			});

			await ctx.prisma.webAction.create({
				data: {
					userId: ctx.session.user.id,
					action: 'permit.edit',
					path: `/permit/${id}`,
					message: `Edited permit #${id.toString().padStart(5, '0')}`,
				},
			});
		}),
	delete: authProcedure
		.use(
			restrict<{ id: number }>(
				{
					or: [Permission.PANEL_PERMIT_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const permit = await ctx.prisma.permit.findUnique({
							where: {
								id: input.id,
							},
							select: {
								authorId: true,
								pending: true,
							},
						});

						if (!permit?.pending) {
							return false;
						}

						return permit?.authorId === ctx.session.user?.id;
					}

					return false;
				},
			),
		)
		.input(
			z
				.object({
					id: z.number(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id } = input;

			const permit = await ctx.prisma.permit.findUnique({
				where: {
					id,
				},
				select: {
					pending: true,
				},
			});

			if (!permit?.pending) {
				return;
			} else {
				await ctx.prisma.permit.delete({
					where: {
						id,
					},
				});

				await ctx.prisma.notification.deleteMany({
					where: {
						path: `/permit/${id}`,
					},
				});

				await ctx.prisma.webAction.create({
					data: {
						userId: ctx.session.user.id,
						action: 'permit.delete',
						path: `/permit/${id}`,
						message: `Deleted permit #${id
							.toString()
							.padStart(5, '0')}`,
					},
				});
			}
		}),
	list: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_PERMIT_MANAGE],
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

			const count = await ctx.prisma.permit.count({
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
									author: {
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

			const data = await ctx.prisma.permit.findMany({
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
									author: {
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
					author: {
						select: {
							name: true,
							email: true,
						},
					},
					pending: true,
					approval: {
						select: {
							author: {
								select: {
									name: true,
									email: true,
								},
							},
							createdAt: true,
							expireAt: true,
						},
					},
					rejection: {
						select: {
							author: {
								select: {
									name: true,
									email: true,
								},
							},
							createdAt: true,
						},
					},
					revocation: {
						select: {
							author: {
								select: {
									name: true,
									email: true,
								},
							},
							createdAt: true,
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
	approve: authProcedure
		.use(
			restrict<{ permitId: number }>(
				{
					or: [Permission.PANEL_PERMIT_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const permit = await ctx.prisma.permit.findUnique({
							where: {
								id: input.permitId,
							},
							select: {
								authorId: true,
								pending: true,
							},
						});

						if (permit?.pending) {
							return true;
						}

						return false;
					}

					return false;
				},
			),
		)
		.use(rateLimit('panel.permit.approve', { points: 1, duration: 15 }))
		.input(
			z.object({
				permitId: z.number(),
				comment: z.string().max(196),
				expireAt: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { permitId, comment, expireAt } = input;

			const permit = await ctx.prisma.permit.findUnique({
				where: {
					id: permitId,
				},
				select: {
					author: {
						select: {
							email: true,
						},
					},
				},
			});

			if (permit) {
				await ctx.prisma.permitApproval.create({
					data: {
						permitId,
						comment,
						authorId: ctx.session.user.id,
						expireAt,
					},
				});

				await ctx.prisma.permit.update({
					where: {
						id: permitId,
					},
					data: {
						pending: false,
					},
				});

				if (
					permit.author.email &&
					permit.author.email !== ctx.session.user.email
				) {
					await pushNotification(
						[permit.author.email],
						`Permit #${permitId.toString().padStart(5, '0')}`,
						'Your permit request has been approved!',
						`/permit/${permitId}`,
					);
				}

				await ctx.prisma.webAction.create({
					data: {
						userId: ctx.session.user.id,
						action: 'permit.approve',
						path: `/permit/${permitId}`,
						message: `Permit #${permitId
							.toString()
							.padStart(5, '0')} has been approved`,
					},
				});
			}
		}),
	reject: authProcedure
		.use(
			restrict<{ permitId: number }>(
				{
					or: [Permission.PANEL_PERMIT_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const permit = await ctx.prisma.permit.findUnique({
							where: {
								id: input.permitId,
							},
							select: {
								authorId: true,
								pending: true,
							},
						});

						if (permit?.pending) {
							return true;
						}

						return false;
					}

					return false;
				},
			),
		)
		.use(rateLimit('panel.permit.reject', { points: 1, duration: 15 }))
		.input(
			z.object({
				permitId: z.number(),
				comment: z.string().max(196),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { permitId, comment } = input;

			const permit = await ctx.prisma.permit.findUnique({
				where: {
					id: permitId,
				},
				select: {
					author: {
						select: {
							email: true,
						},
					},
				},
			});

			if (permit) {
				await ctx.prisma.permitRejection.create({
					data: {
						permitId,
						comment,
						authorId: ctx.session.user.id,
					},
				});

				await ctx.prisma.permit.update({
					where: {
						id: permitId,
					},
					data: {
						pending: false,
					},
				});

				if (
					permit.author.email &&
					permit.author.email !== ctx.session.user.email
				) {
					await pushNotification(
						[permit.author.email],
						`Permit #${permitId.toString().padStart(5, '0')}`,
						'Your permit request has been rejected!',
						`/permit/${permitId}`,
					);
				}

				await ctx.prisma.webAction.create({
					data: {
						userId: ctx.session.user.id,
						action: 'permit.reject',
						path: `/permit/${permitId}`,
						message: `Permit #${permitId
							.toString()
							.padStart(5, '0')} has been rejected`,
					},
				});
			}
		}),
	revoke: authProcedure
		.use(
			restrict<{ permitId: number }>(
				{
					or: [Permission.PANEL_PERMIT_MANAGE],
				},
				async (ctx, input) => {
					if (input) {
						const permit = await ctx.prisma.permit.findUnique({
							where: {
								id: input.permitId,
							},
							select: {
								authorId: true,
								approval: true,
								revocation: true,
							},
						});

						if (permit?.approval && !permit.revocation) {
							return true;
						}
					}

					return false;
				},
			),
		)
		.use(rateLimit('panel.permit.revoke', { points: 1, duration: 15 }))
		.input(
			z.object({
				permitId: z.number(),
				comment: z.string().max(196),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { permitId, comment } = input;

			const permit = await ctx.prisma.permit.findUnique({
				where: {
					id: permitId,
				},
				select: {
					author: {
						select: {
							email: true,
						},
					},
				},
			});

			if (permit) {
				await ctx.prisma.permitRevocation.create({
					data: {
						permitId,
						comment,
						authorId: ctx.session.user.id,
					},
				});

				if (
					permit.author.email &&
					permit.author.email !== ctx.session.user.email
				) {
					await pushNotification(
						[permit.author.email],
						`Permit #${permitId.toString().padStart(5, '0')}`,
						'Your permit has been revoked!',
						`/permit/${permitId}`,
					);
				}

				await ctx.prisma.webAction.create({
					data: {
						userId: ctx.session.user.id,
						action: 'permit.revoke',
						path: `/permit/${permitId}`,
						message: `Permit #${permitId
							.toString()
							.padStart(5, '0')} has been revoked`,
					},
				});
			}
		}),
	analytics: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_PERMIT_MANAGE],
			}),
		)
		.query(async ({ ctx }) => {
			const permits = await ctx.prisma.permit.findMany({
				select: {
					id: true,
					authorId: true,
					approval: true,
					rejection: true,
					revocation: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: {
					createdAt: 'asc',
				},
			});

			const approvedPermits = permits.filter((permit) => permit.approval);

			const rejectedPermits = permits.filter(
				(permit) => permit.rejection,
			);

			const revokedPermits = permits.filter(
				(permit) => permit.revocation,
			);

			const approvedPermitsData = approvedPermits.reduce<
				Record<string, number>
			>(
				(accumulator, current) => {
					const createdAt = current.approval?.createdAt;

					if (
						!createdAt ||
						new Date(createdAt).getTime() <
							Date.now() - 30 * 24 * 60 * 60 * 1000
					) {
						return accumulator;
					}

					const date = new Date(createdAt)
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

			const approvedArr = Object.entries(approvedPermitsData)
				.map(([date, count]) => ({
					date,
					'Approved permits': count,
				}))
				.reverse();

			const rejectedPermitsData = rejectedPermits.reduce<
				Record<string, number>
			>(
				(accumulator, current) => {
					const createdAt = current.rejection?.createdAt;

					if (
						!createdAt ||
						new Date(createdAt).getTime() <
							Date.now() - 30 * 24 * 60 * 60 * 1000
					) {
						return accumulator;
					}

					const date = new Date(createdAt)
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

			const rejectedArr = Object.entries(rejectedPermitsData)
				.map(([date, count]) => ({
					date,
					'Rejected permits': count,
				}))
				.reverse();

			const revokedPermitsData = revokedPermits.reduce<
				Record<string, number>
			>(
				(accumulator, current) => {
					const createdAt = current.revocation?.createdAt;

					if (
						!createdAt ||
						new Date(createdAt).getTime() <
							Date.now() - 30 * 24 * 60 * 60 * 1000
					) {
						return accumulator;
					}

					const date = new Date(createdAt)
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

			const revokedArr = Object.entries(revokedPermitsData)
				.map(([date, count]) => ({
					date,
					'Revoked permits': count,
				}))
				.reverse();

			const data = [...approvedArr, ...rejectedArr, ...revokedArr].reduce<
				Record<
					string,
					Record<
						| 'Approved permits'
						| 'Rejected permits'
						| 'Revoked permits',
						number
					>
				>
			>((acc, cur) => {
				if (typeof acc[cur.date] !== 'object') {
					acc[cur.date] = {
						'Approved permits': 0,
						'Rejected permits': 0,
						'Revoked permits': 0,
					};
				}

				acc[cur.date] = {
					...acc[cur.date],
					...cur,
				};

				return acc;
			}, {});

			return Object.entries(data).map(([date, counts]) => ({
				date,
				...counts,
			}));
		}),
	latest: authProcedure
		.use(
			restrict({
				or: [Permission.PANEL_PERMIT_MANAGE],
			}),
		)
		.query(async ({ ctx }) => {
			const permits = await ctx.prisma.permit.findMany({
				select: {
					id: true,
					createdAt: true,
					author: {
						select: {
							name: true,
						},
					},
				},
				where: {
					pending: true,
				},
				orderBy: {
					createdAt: 'asc',
				},
				take: 3,
			});

			return permits;
		}),
});
