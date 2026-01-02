type LogMeta = Record<string, unknown>;

export const logger = {
    info: (message: string, meta?: LogMeta) => {
        console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }));
    },
    error: (message: string, error?: unknown, meta?: LogMeta) => {
        console.error(JSON.stringify({
            level: 'error',
            message,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    },
    warn: (message: string, meta?: LogMeta) => {
        console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...meta }));
    }
};
