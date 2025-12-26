export const logger = {
    info: (message: string, meta?: any) => {
        console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }));
    },
    error: (message: string, error?: any, meta?: any) => {
        console.error(JSON.stringify({
            level: 'error',
            message,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    },
    warn: (message: string, meta?: any) => {
        console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...meta }));
    }
};
