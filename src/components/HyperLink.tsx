import Link from 'next/link';
import React, { useMemo } from 'react';

export const HyperLink: React.FC<
	React.ComponentPropsWithoutRef<'a'> & { href: string }
> = ({ children, className, ...props }) => {
	const href = useMemo(() => {
		if (props.href.startsWith('/')) return props.href;

		const selfURL = new URL(document.URL);
		const hrefURL = new URL(props.href);

		if (selfURL.origin === hrefURL.origin) {
			if (hrefURL.pathname === '/redirect') {
				const param = hrefURL.searchParams.get('url');

				if (!param) {
					return '/';
				}

				try {
					const paramURL = new URL(param ?? '');

					return param?.length && paramURL.origin !== selfURL.origin
						? param
						: '/';
				} catch (err) {
					return '/';
				}
			}

			const sliced = props.href.slice(hrefURL.origin.length);

			return sliced.length ? sliced : '/';
		}

		return props.href;
	}, [props.href]);

	if (href.startsWith('/'))
		return (
			<Link
				{...props}
				href={href}
				className={`text-blue-400 hover:underline cursor-pointer inline italic ${className}`}
			>
				{href ?? children}
			</Link>
		);

	return (
		<Link
			{...props}
			className={`text-blue-400 hover:underline cursor-pointer inline italic ${className}`}
			href={`/redirect?url=${encodeURIComponent(href)}`}
			rel="noreferrer"
		>
			{href ?? children}
		</Link>
	);
};
