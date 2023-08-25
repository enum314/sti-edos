import { ReactNode } from 'react';

export function PageTitle({ children }: { children: ReactNode }) {
	return (
		<>
			<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 select-none flex gap-5">
				{children}
			</h1>
		</>
	);
}
