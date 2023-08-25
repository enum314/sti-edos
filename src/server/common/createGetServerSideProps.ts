import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';

import { hasPermission, RestrictOptions } from '../../utils/hasPermission';
import { prisma } from '../../utils/prisma';

type ForWho = 'guest' | 'guestOnly' | 'user' | 'admin';

export function createGetServerSideProps(forWho: ForWho) {
	switch (forWho) {
		case 'guest': {
			return guest;
		}
		case 'guestOnly': {
			return guestOnly;
		}
		case 'user': {
			return user;
		}
		case 'admin': {
			return admin;
		}
	}
}

const guest: GetServerSideProps = async (ctx) => {
	return {
		props: {
			session: await getSession(ctx),
		},
	};
};

const guestOnly: GetServerSideProps = async (ctx) => {
	const session = await getSession(ctx);

	if (session?.user) {
		return {
			redirect: {
				destination: '/',
				permanent: false,
			},
		};
	}

	return {
		props: {
			session,
		},
	};
};

const user: GetServerSideProps = async (ctx) => {
	const session = await getSession(ctx);

	if (!session?.user) {
		return {
			redirect: {
				destination: '/auth/login',
				permanent: false,
			},
		};
	}

	return {
		props: {
			session,
		},
	};
};

const admin: GetServerSideProps = async (ctx) => {
	const session = await getSession(ctx);

	if (!session?.user) {
		return {
			redirect: {
				destination: '/auth/login',
				permanent: false,
			},
		};
	}

	if (!session.user.isAdmin) {
		return {
			redirect: {
				destination: '/',
				permanent: false,
			},
		};
	}

	return {
		props: {
			session,
		},
	};
};

export function restrictedGetServerSideProps(
	opts: RestrictOptions,
	additionalCheck?: () => Promise<boolean> | boolean,
) {
	const restricted: GetServerSideProps = async (ctx) => {
		const session = await getSession(ctx);

		if (!session?.user) {
			return {
				redirect: {
					destination: '/auth/login',
					permanent: false,
				},
			};
		}

		const user = await prisma.user.findUnique({
			select: {
				role: true,
			},
			where: {
				id: session.user.id,
			},
		});

		if (hasPermission(opts, user?.role, session.user.isAdmin)) {
			return {
				props: {
					session,
				},
			};
		}

		if (additionalCheck && (await additionalCheck())) {
			return {
				props: {
					session,
				},
			};
		}

		return {
			redirect: {
				destination: '/',
				permanent: false,
			},
		};
	};

	return restricted;
}
