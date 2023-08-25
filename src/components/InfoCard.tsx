interface InfoCardProps {
	color: 'red' | 'green' | 'blue' | 'yellow';
	icon: React.ReactNode;
	title: string;
	value: string;
	onClick: () => void;
}

export const InfoCard: React.FC<InfoCardProps> = ({
	color,
	icon,
	title,
	value,
	onClick,
}) => {
	return (
		<button
			onClick={onClick}
			className={`grid grid-cols-3 w-full h-full rounded-lg shadow-md ${
				typeof onClick === 'function'
					? 'cursor-pointer hover:shadow-xl transition-all duration-100'
					: ''
			}`}
		>
			<div
				className={`${
					color === 'red'
						? 'bg-rose-500'
						: color === 'green'
						? 'bg-green-500'
						: color === 'blue'
						? 'bg-blue-500'
						: 'bg-yellow-400'
				} rounded-l-lg grid place-items-center h-full`}
			>
				{icon}
			</div>
			<div
				className={`text-left grid gap-2 bg-white col-span-2 rounded-r-lg p-3 px-5`}
			>
				<p className="text-gray-800 font-bold">{title}</p>
				<p className="text-gray-700 font-semibold">{value}</p>
			</div>
		</button>
	);
};
