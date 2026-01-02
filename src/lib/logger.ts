type LogMeta = Record<string, unknown>;

// Check if running in production
const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
    info: (message: string, meta?: LogMeta) => {
        console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }));
    },
    error: (message: string, error?: unknown, meta?: LogMeta) => {
        // In production, omit stack traces to prevent internal path exposure
        let errorInfo: { message: string; stack?: string } | unknown;
        if (error instanceof Error) {
            errorInfo = isProduction
                ? { message: error.message }
                : { message: error.message, stack: error.stack };
        } else {
            errorInfo = error;
        }
        console.error(JSON.stringify({
            level: 'error',
            message,
            error: errorInfo,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    },
    warn: (message: string, meta?: LogMeta) => {
        console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...meta }));
    }
};

