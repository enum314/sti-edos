import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { env } from '../../env/server';
import { rateLimit } from '../middlewares/rateLimit';
import { pushNotification } from '../pushNotification';
import { attachmentUrls } from '../stores';
import { authProcedure, router } from '../trpc';

export const announcementRouter = router({
	list: authProcedure.query(async ({ ctx }) => {
		const data = await ctx.prisma.announcement.findMany({
			select: {
				id: true,
				title: true,
				message: true,
				createdAt: true,
				ratings: {
					select: {
						rating: true,
					},
				},
				author: {
					select: {
						name: true,
						email: true,
						role: {
							select: {
								color: true,
								name: true,
							},
						},
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		return {
			data,
		};
	}),
	get: authProcedure
		.input(
			z
				.object({
					id: z.string().cuid(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const { id } = input;

			const announcement = await ctx.prisma.announcement.findUnique({
				where: {
					id,
				},
				select: {
					id: true,
					title: true,
					message: true,
					attachments: true,
					createdAt: true,
					updatedAt: true,
					author: {
						select: {
							name: true,
							email: true,
							role: {
								select: {
									color: true,
									name: true,
								},
							},
						},
					},
					ratings: {
						select: {
							id: true,
							rating: true,
							author: {
								select: {
									id: true,
									name: true,
									email: true,
								},
							},
						},
					},
					comments: {
						select: {
							id: true,
							message: true,
							createdAt: true,
							author: {
								select: {
									id: true,
									name: true,
									email: true,
									role: {
										select: {
											color: true,
											name: true,
										},
									},
								},
							},
							likes: {
								select: {
									author: {
										select: {
											id: true,
											name: true,
											email: true,
											role: {
												select: {
													color: true,
													name: true,
												},
											},
										},
									},
								},
							},
							replies: {
								select: {
									commentId: true,
									id: true,
									message: true,
									createdAt: true,
									likes: {
										select: {
											author: {
												select: {
													id: true,
													name: true,
													email: true,
													role: {
														select: {
															color: true,
															name: true,
														},
													},
												},
											},
										},
									},
									author: {
										select: {
											id: true,
											name: true,
											email: true,
											role: {
												select: {
													color: true,
													name: true,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			});

			if (!announcement) return null;

			const attachments: {
				id: string;
				key: string;
				fileName: string;
				url: string;
			}[] = [];

			for (const attachment of announcement.attachments) {
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

			await ctx.prisma.notification.updateMany({
				where: {
					userId: ctx.session.user.id,
					path: `/announcement/${id}`,
					read: false,
				},
				data: {
					read: true,
				},
			});

			return { ...announcement, attachments };
		}),
	rate: authProcedure
		.use(rateLimit('announcement.rate', { points: 1, duration: 10 }))
		.input(
			z
				.object({
					id: z.string().cuid(),
					rating: z.number().min(1).max(5),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, rating } = input;

			const announcement = await ctx.prisma.announcement.findUnique({
				where: {
					id,
				},
				select: {
					id: true,
				},
			});

			if (!announcement) {
				throw new TRPCError({
					message: 'Announcement not found',
					code: 'NOT_FOUND',
				});
			}

			const existingRating =
				await ctx.prisma.announcementRating.findFirst({
					where: {
						announcementId: id,
						authorId: ctx.session.user.id,
					},
				});

			if (existingRating) {
				await ctx.prisma.announcementRating.update({
					where: {
						id: existingRating.id,
					},
					data: {
						rating,
					},
				});
			} else {
				await ctx.prisma.announcementRating.create({
					data: {
						announcementId: id,
						authorId: ctx.session.user.id,
						rating,
					},
				});
			}

			return true;
		}),
	comment: authProcedure
		.use(rateLimit('announcement.comment', { points: 2, duration: 15 }))
		.input(
			z
				.object({
					id: z.string().cuid(),
					message: z.string().min(1).max(500),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, message } = input;

			const announcement = await ctx.prisma.announcement.findUnique({
				where: {
					id,
				},
				select: {
					id: true,
					author: {
						select: {
							email: true,
						},
					},
				},
			});

			if (!announcement) {
				throw new TRPCError({
					message: 'Announcement not found',
					code: 'NOT_FOUND',
				});
			}

			const comment = await ctx.prisma.announcementComment.create({
				data: {
					announcementId: id,
					authorId: ctx.session.user.id,
					message: message.trim(),
				},
			});

			await pushNotification(
				[announcement.author.email ?? '']
					.filter(Boolean)
					.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					})
					.filter((item) => item !== ctx.session.user.email),
				'New comment on your announcement',
				`${ctx.session.user.name as string}: ${comment.message}`,
				`/announcement/${announcement.id}`,
			);

			return true;
		}),
	likeComment: authProcedure
		.use(rateLimit('announcement.comment.like', { points: 5, duration: 5 }))
		.input(
			z
				.object({
					id: z.string().cuid(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id } = input;

			const comment = await ctx.prisma.announcementComment.findUnique({
				where: {
					id,
				},
				select: {
					id: true,
					announcementId: true,
					author: {
						select: {
							email: true,
						},
					},
				},
			});

			if (!comment) {
				throw new TRPCError({
					message: 'Comment not found',
					code: 'NOT_FOUND',
				});
			}

			const existingLike =
				await ctx.prisma.announcementCommentLike.findFirst({
					where: {
						commentId: id,
						authorId: ctx.session.user.id,
					},
				});

			if (existingLike) {
				await ctx.prisma.announcementCommentLike.delete({
					where: {
						id: existingLike.id,
					},
				});
			} else {
				await ctx.prisma.announcementCommentLike.create({
					data: {
						commentId: id,
						authorId: ctx.session.user.id,
					},
				});

				await pushNotification(
					[comment.author.email ?? '']
						.filter(Boolean)
						.filter((item, index, self) => {
							return index === self.findIndex((t) => t === item);
						})
						.filter((item) => item !== ctx.session.user.email),
					'Someone liked your comment',
					`${ctx.session.user.name as string}: ${
						ctx.session.user.name
					}`,
					`/announcement/${comment.announcementId}`,
				);
			}

			return true;
		}),
	replyComment: authProcedure
		.use(
			rateLimit('announcement.comment.reply', {
				points: 2,
				duration: 15,
			}),
		)
		.input(
			z.object({
				id: z.string().cuid(),
				message: z.string().min(1).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, message } = input;

			const comment = await ctx.prisma.announcementComment.findUnique({
				where: {
					id,
				},
				select: {
					id: true,
					announcementId: true,
					author: {
						select: {
							email: true,
						},
					},
				},
			});

			if (!comment) {
				throw new TRPCError({
					message: 'Comment not found',
					code: 'NOT_FOUND',
				});
			}

			const reply = await ctx.prisma.announcementReply.create({
				data: {
					commentId: id,
					authorId: ctx.session.user.id,
					message: message.trim(),
				},
			});

			await pushNotification(
				[comment.author.email ?? '']
					.filter(Boolean)
					.filter((item, index, self) => {
						return index === self.findIndex((t) => t === item);
					})
					.filter((item) => item !== ctx.session.user.email),
				'New reply on your comment',
				`${ctx.session.user.name as string}: ${reply.message}`,
				`/announcement/${comment.announcementId}`,
			);

			return true;
		}),
	likeReply: authProcedure
		.use(
			rateLimit('announcement.comment.reply.like', {
				points: 5,
				duration: 5,
			}),
		)
		.input(
			z
				.object({
					id: z.string().cuid(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const { id } = input;

			const reply = await ctx.prisma.announcementReply.findUnique({
				where: {
					id,
				},
				select: {
					id: true,
					author: {
						select: {
							email: true,
						},
					},
					comment: {
						select: {
							announcementId: true,
						},
					},
				},
			});

			if (!reply) {
				throw new TRPCError({
					message: 'Reply not found',
					code: 'NOT_FOUND',
				});
			}

			const existingLike =
				await ctx.prisma.announcementReplyLike.findFirst({
					where: {
						replyId: id,
						authorId: ctx.session.user.id,
					},
				});

			if (existingLike) {
				await ctx.prisma.announcementReplyLike.delete({
					where: {
						id: existingLike.id,
					},
				});
			} else {
				await ctx.prisma.announcementReplyLike.create({
					data: {
						replyId: id,
						authorId: ctx.session.user.id,
					},
				});

				await pushNotification(
					[reply.author.email ?? '']
						.filter(Boolean)
						.filter((item, index, self) => {
							return index === self.findIndex((t) => t === item);
						})
						.filter((item) => item !== ctx.session.user.email),
					'Someone liked your reply',
					`${ctx.session.user.name as string}: ${
						ctx.session.user.name
					}`,
					`/announcement/${reply.comment.announcementId}`,
				);
			}

			return true;
		}),
});
