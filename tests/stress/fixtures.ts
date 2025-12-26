/**
 * Test data generators for stress testing
 */

export interface TestConfig {
    baseUrl: string;
    token: string;
}

export function generateTextContent(index: number): string {
    const messages = [
        'Confidential project update',
        'Sealed bid proposal',
        'Time capsule message',
        'Secret meeting notes',
        'Encrypted diary entry',
        'Future announcement draft',
        'Delayed release statement'
    ];

    const message = messages[index % messages.length];
    return `${message} #${index} - ${new Date().toISOString()}`;
}

export function generateImageBase64(size: 'small' | 'medium' | 'large' = 'small'): string {
    // Generate a simple base64-encoded PNG (1x1 pixel, different colors for variety)
    const colors = {
        small: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // Red
        medium: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Green
        large: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==' // Blue
    };

    return colors[size];
}

export function generateMetadata(index: number): Record<string, any> {
    return {
        testId: `stress-test-${index}`,
        timestamp: Date.now(),
        category: ['personal', 'business', 'research'][index % 3],
        priority: ['low', 'medium', 'high'][index % 3],
        // Test markers for easy cleanup
        _test: true,
        _testType: 'stress',
        _testRunId: process.env.TEST_RUN_ID || Date.now()
    };
}

export function randomDuration(): number {
    // Random duration between 1 minute and 60 minutes
    const durations = [1, 5, 10, 30, 60];
    return durations[Math.floor(Math.random() * durations.length)];
}
