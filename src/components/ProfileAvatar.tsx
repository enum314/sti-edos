import { Avatar, MantineColor, MantineSize } from '@mantine/core';
import React, { forwardRef, useMemo } from 'react';

function getRandomColor(seed: string): MantineColor {
	const colors = [
		'red',
		'pink',
		'grape',
		'violet',
		'indigo',
		'green',
		'lime',
		'yellow',
		'orange',
		'teal',
		'blue',
		'cyan',
	];

	let hash = 0;

	for (let i = 0; i < seed.length; i++) {
		hash = seed.charCodeAt(i) + ((hash << 5) - hash);
	}

	const randomIndex = Math.floor(Math.abs(Math.sin(hash)) * colors.length);

	return colors[randomIndex];
}

interface ProfileAvatarProps {
	className?: string;
	size: MantineSize;
	children: string;
	dot?: boolean;
}

export const ProfileAvatar = forwardRef<HTMLDivElement, ProfileAvatarProps>(
	({ className, size, children, dot }, ref) => {
		const [initials] = useMemo(() => {
			if (dot) {
				return [children[0].toUpperCase()];
			}

			const splitted = children.split(/ +/g);

			const initials = splitted[0][0] + splitted[1][0];

			return [initials];
		}, [children, dot]);

		return (
			<Avatar
				ref={ref}
				size={size}
				color={getRandomColor(children[0].toUpperCase())}
				className={className}
				alt=""
				radius="xl"
			>
				{initials}
			</Avatar>
		);
	},
);

ProfileAvatar.displayName = 'ProfileAvatar';
