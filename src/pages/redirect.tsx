import { useRouter } from 'next/router';
import { useEffect } from 'react';

import Loading from '../components/Loading';

export default function Redirect() {
	const router = useRouter();

	useEffect(() => {
		if (
			typeof router.query.url === 'string' &&
			typeof window !== 'undefined'
		) {
			window.open(router.query.url);
			router.back();
		}
	}, [router]);

	return <Loading />;
}
