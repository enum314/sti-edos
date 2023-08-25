import { useRouter } from 'next/router';
import { useEffect } from 'react';

import Loading from '../components/Loading';
import { createGetServerSideProps } from '../server/common/createGetServerSideProps';

export const getServerSideProps = createGetServerSideProps('user');

export default function Home() {
	const router = useRouter();

	useEffect(() => {
		router.push('/dashboard');
	}, [router]);

	return (
		<div className="h-screen bg-neutral-200">
			<Loading className="my-auto" />
		</div>
	);
}
