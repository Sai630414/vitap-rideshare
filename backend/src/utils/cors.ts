import { CorsOptions } from 'cors';

/**
 * Generates the CORS origin matching function based on CLIENT_URL env variable.
 * Supports comma-separated origins.
 */
export const getCorsOrigin = () => {
  const clientUrls = (process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app')
    .split(',')
    .map((url) => url.trim());

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // If no origin (e.g. mobile apps, postman, curl, or same-origin), allow it
      console.log("Incoming Origin:", origin);
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in the allowed client URLs list
    if (clientUrls.includes(origin)) {
      return callback(null, true);
    }

    // In development mode, allow localhost/127.0.0.1 origins
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost =
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.startsWith('http://localhost:');
      if (isLocalhost) {
        return callback(null, true);
      }
    }

    return callback(new Error('Not allowed by CORS'));
  };
};

/**
 * Shared CORS Options for Express middleware
 */
export const corsOptions: CorsOptions = {
  origin: getCorsOrigin(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
};
