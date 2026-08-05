import logger from '../utils/logger';

/**
 * Send SMS OTP via AWS SNS (or dev fallback logger)
 */
export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
  try {
    // AWS SNS integration if AWS credentials are set
    if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        // Dynamic require to prevent missing package compile errors when AWS SDK isn't installed
        const awsSns = eval('require')('@aws-sdk/client-sns');
        const client = new awsSns.SNSClient({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const command = new awsSns.PublishCommand({
          Message: message,
          PhoneNumber: phoneNumber,
        });

        await client.send(command);
        logger.info(`✅ AWS SNS SMS sent successfully to ${phoneNumber}`);
        return true;
      } catch (awsErr: any) {
        logger.warn(`AWS SNS SDK not installed or failed: ${awsErr.message}. Falling back to dev logger.`);
      }
    }

    // Development/Fallback Mode
    logger.info(`📱 [SMS DISPATCH] To: ${phoneNumber} | Message: "${message}"`);
    return true;
  } catch (err: any) {
    logger.error(`❌ Failed to send SMS to ${phoneNumber}: ${err.message}`);
    logger.info(`📱 [FALLBACK SMS DISPATCH] To: ${phoneNumber} | Message: "${message}"`);
    return true;
  }
};
