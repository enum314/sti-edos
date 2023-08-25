import { S3 } from 'aws-sdk';

import { env } from '../env/server';

export const storage = new S3({
	credentials: {
		accessKeyId: env.STORAGE_ACCESS_KEY,
		secretAccessKey: env.STORAGE_SECRET_KEY,
	},
	endpoint: env.STORAGE_ENDPOINT,
	region: env.STORAGE_REGION,
	s3ForcePathStyle: true,
});
