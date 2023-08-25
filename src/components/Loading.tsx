import { DefaultMantineColor, Loader, MantineTheme } from '@mantine/core';

export default function Loading({
	className,
	variant,
	color,
}: {
	className?: string;
	variant?: MantineTheme['loader'];
	color?: DefaultMantineColor;
}) {
	return (
		<div
			className={`grid place-items-center h-full w-full ${
				className ?? ''
			}`}
		>
			<Loader color={color} variant={variant} />
		</div>
	);
}
