import { TypographyStylesProvider } from '@mantine/core';

export function RenderHTML({
	className,
	children,
}: {
	children: string;
	className?: string;
}) {
	return (
		<TypographyStylesProvider>
			<article
				className={`prose ${className ?? ''}`}
				dangerouslySetInnerHTML={{ __html: children }}
			/>
		</TypographyStylesProvider>
	);
}
