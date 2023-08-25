interface CardProps {
	title: string;
	className?: string;
	children?: React.ReactNode;
	noPadding?: boolean;
	classNames?: {
		title?: string;
		container?: string;
	};
}

export const Card: React.FC<CardProps> = ({
	title,
	className,
	classNames,
	children,
	noPadding,
}) => {
	return (
		<div className={`bg-gray-100 shadow-lg rounded-lg ${className}`}>
			<h2
				className={`bg-white py-2 px-5 select-none text-xl md:text-2xl font-medium border-b text-gray-800 rounded-t-lg ${
					classNames?.title ?? ''
				}`}
			>
				{title}
			</h2>
			<div
				className={`${noPadding ? '' : 'p-5'} rounded-b-lg ${
					classNames?.container ?? ''
				}`}
			>
				{children}
			</div>
		</div>
	);
};
