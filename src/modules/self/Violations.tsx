import { Avatar, Badge, Tooltip } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useState } from 'react';

import { ProfileAvatar } from '../../components/ProfileAvatar';
import { RelativeFormat } from '../../utils/RelativeFormat';
import { trpc } from '../../utils/trpc';

export function Violations() {
	const router = useRouter();

	const [page, setPage] = useState(1);

	const { data: list, isLoading } = trpc.self.violations.useQuery({
		page,
		MAX_LIMIT: 10,
	});

	return (
		<DataTable
			minHeight={450}
			fetching={isLoading}
			withBorder
			borderRadius="md"
			shadow="md"
			withColumnBorders
			highlightOnHover
			page={page}
			recordsPerPage={10}
			onPageChange={(p) => setPage(p)}
			records={list?.data ?? []}
			totalRecords={list?.count ?? 0}
			noRecordsText="You have no violations"
			onRowClick={({ id }) => {
				router.push(`/violation/${id}`);
			}}
			columns={[
				{
					accessor: 'id',
					title: 'ID',
					textAlignment: 'center',
					render: ({ id }) => (
						<p className="font-semibold text-lg whitespace-nowrap text-gray-700">
							<span className="text-gray-800">#</span>
							{id.toString().padStart(5, '0')}
						</p>
					),
				},
				{
					accessor: 'Level',
					title: 'Offense',
					render: ({ level }) => (
						<div className="whitespace-nowrap">
							{level === 'MINOR' ? (
								<Tooltip label="Minor Offense">
									<Badge variant="dot" color="yellow">
										Minor
									</Badge>
								</Tooltip>
							) : level === 'MAJOR_A' ? (
								<Tooltip label="Major Offense - Category A">
									<Badge variant="dot" color="red">
										Major (A)
									</Badge>
								</Tooltip>
							) : level === 'MAJOR_B' ? (
								<Tooltip label="Major Offense - Category B">
									<Badge variant="dot" color="red">
										Major (B)
									</Badge>
								</Tooltip>
							) : level === 'MAJOR_C' ? (
								<Tooltip label="Major Offense - Category C">
									<Badge variant="dot" color="red">
										Major (C)
									</Badge>
								</Tooltip>
							) : (
								<Tooltip label="Major Offense - Category D">
									<Badge variant="dot" color="red">
										Major (D)
									</Badge>
								</Tooltip>
							)}
						</div>
					),
				},
				{
					accessor: 'violation',
					title: 'Violation',
					render: ({ name }) => (
						<p className="whitespace-nowrap">{name as string}</p>
					),
				},
				{
					accessor: 'violators',
					title: 'Violator(s)',
					render: ({ violators }) => (
						<Tooltip.Group openDelay={300} closeDelay={100}>
							<Avatar.Group spacing="sm">
								<Tooltip label={violators[0]} withArrow>
									<ProfileAvatar size="md" dot>
										{violators[0] as string}
									</ProfileAvatar>
								</Tooltip>
								{violators.length > 1 ? (
									<Tooltip
										label={violators[1] as string}
										withArrow
									>
										<ProfileAvatar size="md" dot>
											{violators[1] as string}
										</ProfileAvatar>
									</Tooltip>
								) : null}
								{violators.length > 2 ? (
									<Tooltip
										label={violators[2] as string}
										withArrow
									>
										<ProfileAvatar size="md" dot>
											{violators[2] as string}
										</ProfileAvatar>
									</Tooltip>
								) : null}
								{violators.slice(3).length ? (
									<Tooltip
										withArrow
										label={
											<>
												{violators.slice(3).map((x) => (
													<div key={x}>{x}</div>
												))}
											</>
										}
									>
										<Avatar radius="xl">
											+{violators.slice(3).length}
										</Avatar>
									</Tooltip>
								) : null}
							</Avatar.Group>
						</Tooltip.Group>
					),
				},
				{
					accessor: 'issuer',
					title: 'Issuer',
					textAlignment: 'center',
					render: ({ issuer }) => (
						<Tooltip label={issuer?.name} withArrow>
							<ProfileAvatar size="md" className="mx-auto">
								{issuer?.name as string}
							</ProfileAvatar>
						</Tooltip>
					),
				},
				{
					accessor: 'createdAt',
					title: 'Issued At',
					render: ({ createdAt }) => (
						<p className="whitespace-nowrap">
							{RelativeFormat(createdAt)}
						</p>
					),
				},
			]}
		/>
	);
}
