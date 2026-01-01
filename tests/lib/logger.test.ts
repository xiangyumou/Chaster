import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/logger';

describe('Lib: Logger', () => {
    let consoleSpy: {
        log: ReturnType<typeof vi.spyOn>;
        error: ReturnType<typeof vi.spyOn>;
        warn: ReturnType<typeof vi.spyOn>;
    };

    beforeEach(() => {
        consoleSpy = {
            log: vi.spyOn(console, 'log').mockImplementation(() => { }),
            error: vi.spyOn(console, 'error').mockImplementation(() => { }),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('logger.info', () => {
        it('should log info message with correct format', () => {
            logger.info('Test info message');

            expect(consoleSpy.log).toHaveBeenCalledTimes(1);
            const loggedArg = consoleSpy.log.mock.calls[0][0];
            const parsed = JSON.parse(loggedArg);

            expect(parsed.level).toBe('info');
            expect(parsed.message).toBe('Test info message');
            expect(parsed.timestamp).toBeDefined();
            expect(new Date(parsed.timestamp).getTime()).not.toBeNaN();
        });

        it('should include metadata when provided', () => {
            logger.info('Info with meta', { userId: 'user-123', action: 'login' });

            const loggedArg = consoleSpy.log.mock.calls[0][0];
            const parsed = JSON.parse(loggedArg);

            expect(parsed.userId).toBe('user-123');
            expect(parsed.action).toBe('login');
        });

        it('should handle empty metadata', () => {
            logger.info('Simple message', {});

            expect(consoleSpy.log).toHaveBeenCalledTimes(1);
            const parsed = JSON.parse(consoleSpy.log.mock.calls[0][0]);
            expect(parsed.message).toBe('Simple message');
        });
    });

    describe('logger.error', () => {
        it('should log error message with correct format', () => {
            logger.error('Test error message');

            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
            const loggedArg = consoleSpy.error.mock.calls[0][0];
            const parsed = JSON.parse(loggedArg);

            expect(parsed.level).toBe('error');
            expect(parsed.message).toBe('Test error message');
            expect(parsed.timestamp).toBeDefined();
        });

        it('should serialize Error objects properly', () => {
            const error = new Error('Something went wrong');
            logger.error('Error occurred', error);

            const loggedArg = consoleSpy.error.mock.calls[0][0];
            const parsed = JSON.parse(loggedArg);

            expect(parsed.error.message).toBe('Something went wrong');
            expect(parsed.error.stack).toContain('Error: Something went wrong');
        });

        it('should handle non-Error error values', () => {
            logger.error('Error occurred', { customError: true, code: 500 });

            const loggedArg = consoleSpy.error.mock.calls[0][0];
            const parsed = JSON.parse(loggedArg);

            expect(parsed.error.customError).toBe(true);
            expect(parsed.error.code).toBe(500);
        });

        it('should include additional metadata', () => {
            const error = new Error('DB error');
            logger.error('Database failed', error, { query: 'SELECT *', db: 'main' });

            const parsed = JSON.parse(consoleSpy.error.mock.calls[0][0]);

            expect(parsed.query).toBe('SELECT *');
            expect(parsed.db).toBe('main');
            expect(parsed.error.message).toBe('DB error');
        });

        it('should handle undefined error parameter', () => {
            logger.error('Error without details', undefined);

            const parsed = JSON.parse(consoleSpy.error.mock.calls[0][0]);
            expect(parsed.message).toBe('Error without details');
            expect(parsed.error).toBeUndefined();
        });
    });

    describe('logger.warn', () => {
        it('should log warning message with correct format', () => {
            logger.warn('Test warning message');

            expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
            const loggedArg = consoleSpy.warn.mock.calls[0][0];
            const parsed = JSON.parse(loggedArg);

            expect(parsed.level).toBe('warn');
            expect(parsed.message).toBe('Test warning message');
            expect(parsed.timestamp).toBeDefined();
        });

        it('should include metadata when provided', () => {
            logger.warn('Deprecation warning', { feature: 'oldAPI', replacement: 'newAPI' });

            const parsed = JSON.parse(consoleSpy.warn.mock.calls[0][0]);

            expect(parsed.feature).toBe('oldAPI');
            expect(parsed.replacement).toBe('newAPI');
        });
    });

    describe('timestamp consistency', () => {
        it('should generate valid ISO timestamps', () => {
            logger.info('Timestamp test');
            logger.error('Error timestamp');
            logger.warn('Warn timestamp');

            [consoleSpy.log, consoleSpy.error, consoleSpy.warn].forEach((spy) => {
                const parsed = JSON.parse(spy.mock.calls[0][0]);
                const timestamp = new Date(parsed.timestamp);
                expect(timestamp.getTime()).not.toBeNaN();
                // Timestamp should be recent (within last minute)
                expect(Date.now() - timestamp.getTime()).toBeLessThan(60000);
            });
        });
    });

    describe('JSON output', () => {
        it('should produce valid JSON for all log levels', () => {
            logger.info('Info');
            logger.error('Error', new Error('test'));
            logger.warn('Warn');

            expect(() => JSON.parse(consoleSpy.log.mock.calls[0][0])).not.toThrow();
            expect(() => JSON.parse(consoleSpy.error.mock.calls[0][0])).not.toThrow();
            expect(() => JSON.parse(consoleSpy.warn.mock.calls[0][0])).not.toThrow();
        });
    });
});
