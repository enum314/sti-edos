import { Group } from '@mantine/core';
import { forwardRef } from 'react';

interface RolePillProps {
	className?: string;
	label: string;
	color: string;
}

export const RolePill = forwardRef<HTMLDivElement, RolePillProps>(
	({ label, color, className, ...props }, ref) => (
		<div ref={ref} {...props}>
			<Group
				className={`px-2 py-1 rounded-lg ${
					className ? className : ''
				} whitespace-nowrap`}
				noWrap
			>
				<div
					className="rounded-full w-4 h-4 text-slate-200"
					style={{ backgroundColor: color }}
				></div>

				<div>
					<p className="font-semibold text-slate-800">{label}</p>
				</div>
			</Group>
		</div>
	),
);

RolePill.displayName = 'RolePill';
