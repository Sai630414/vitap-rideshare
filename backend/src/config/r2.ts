import { S3Client } from '@aws-sdk/client-s3';
import logger from '../utils/logger';

const isR2Configured = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

let r2Client: S3Client | null = null;

if (isR2Configured) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  logger.info('Cloudflare R2 integration enabled.');
} else {
  logger.warn('Cloudflare R2 credentials not found.');
}

export { r2Client, isR2Configured };
export default r2Client;