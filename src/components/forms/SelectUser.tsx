import { Group, Text } from '@mantine/core';
import { forwardRef } from 'react';

import { ProfileAvatar } from '../ProfileAvatar';

interface SelectUserProps extends React.ComponentPropsWithoutRef<'div'> {
	label: string;
	value: string;
}

export const SelectUser = forwardRef<HTMLDivElement, SelectUserProps>(
	({ label, value, ...others }: SelectUserProps, ref) => (
		<div ref={ref} {...others}>
			<Group noWrap>
				<ProfileAvatar size="md" dot>
					{label}
				</ProfileAvatar>

				<div>
					<Text>{label}</Text>
					{label !== value ? (
						<Text size="xs" color="dimmed">
							{value}
						</Text>
					) : null}
				</div>
			</Group>
		</div>
	),
);

SelectUser.displayName = 'SelectUser';
