import { Role } from '@prisma/client';

import { Permission } from './Constants';

export interface RestrictOptions {
	all?: Permission[];
	or?: Permission[];
}

export function hasPermission(
	opts: RestrictOptions,
	role: Role | null | undefined,
	isAdmin: boolean,
) {
	if (isAdmin) return true;

	if (role === null || role === undefined) return false;

	if (
		opts.all?.length &&
		role.permissions.every((permission) =>
			opts.all?.includes(permission as Permission),
		)
	) {
		return true;
	}

	if (
		opts.or?.length &&
		role.permissions.some((permission) =>
			opts.or?.includes(permission as Permission),
		)
	) {
		return true;
	}

	return false;
}
