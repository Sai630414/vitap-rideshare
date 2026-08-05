"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = exports.getCorsOrigin = void 0;
/**
 * Generates the CORS origin matching function based on CLIENT_URL env variable.
 * Supports comma-separated origins.
 */
const getCorsOrigin = () => {
    const clientUrls = (process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app')
        .split(',')
        .map((url) => url.trim());
    return (origin, callback) => {
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
            const isLocalhost = origin.includes('localhost') ||
                origin.includes('127.0.0.1') ||
                origin.startsWith('http://localhost:');
            if (isLocalhost) {
                return callback(null, true);
            }
        }
        return callback(new Error('Not allowed by CORS'));
    };
};
exports.getCorsOrigin = getCorsOrigin;
/**
 * Shared CORS Options for Express middleware
 */
exports.corsOptions = {
    origin: (0, exports.getCorsOrigin)(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
};
