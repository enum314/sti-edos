import { Rating } from '@mantine/core';
import { Comme } from 'next/font/google';
import Link from 'next/link';

import { ProfileAvatar } from './ProfileAvatar';

const comme = Comme({ subsets: ['latin'] });

interface AnnouncementCardProps {
	id: string;
	title: string;
	message: string;
	date: string;
	datetime: string;
	author: {
		name: string;
		role: {
			name: string;
			color: string;
		} | null;
	};
	ratings: number[];
}

export function AnnouncementCard(props: AnnouncementCardProps) {
	return (
		<article className="bg-white rounded-md shadow-md p-5 flex flex-col items-start justify-between">
			<div className="flex items-center gap-x-4 text-xs">
				<time dateTime={props.datetime} className="text-gray-500">
					{props.date}
				</time>
				<div className="flex items-center gap-x-2">
					<Rating
						value={
							props.ratings.reduce((a, b) => a + b, 0) /
							props.ratings.length
						}
						fractions={2}
						size="md"
						readOnly
					/>
					<p className="text-md text-gray-600 tracking-wide">
						{props.ratings.reduce((a, b) => a + b, 0) %
							props.ratings.length !==
						0
							? (
									props.ratings.reduce((a, b) => a + b, 0) /
									props.ratings.length
							  ).toFixed(2)
							: props.ratings.reduce((a, b) => a + b, 0) /
							  props.ratings.length}
						/5 ({props.ratings.length})
					</p>
				</div>
			</div>
			<div className="group relative">
				<h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
					<Link href={`/announcement/${props.id}`}>
						<span className="absolute inset-0" />
						{props.title}
					</Link>
				</h3>
				<p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">
					{props.message}
				</p>
				<p className="mt-2 tracking-wider text-sm leading-6 text-gray-700">
					See full post...
				</p>
			</div>
			<div className="relative mt-8 flex items-center gap-x-4 border-gray-900">
				<ProfileAvatar size="md">{props.author.name}</ProfileAvatar>
				<div className="text-sm leading-6">
					<p
						className={`font-semibold text-gray-900 ${comme.className}`}
					>
						<span className="absolute inset-0" />
						{props.author.name}
					</p>
					<p className={`text-gray-600`}>
						{props.author.role ? props.author.role.name : ''}
					</p>
				</div>
			</div>
		</article>
	);
}
