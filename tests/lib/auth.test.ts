import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getPrismaClient } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    getPrismaClient: vi.fn()
}));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue({}); // Mock update too

(getPrismaClient as any).mockReturnValue({
    apiToken: { // Fixed: apiToken instead of token
        findUnique: mockFindUnique,
        update: mockUpdate
    }
});

describe('Lib: Auth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fail if no authorization header', async () => {
        const req = new NextRequest('http://localhost/api');
        const result = await authenticate(req);
        expect(result).toHaveProperty('error');
        expect((result as any).error.status).toBe(401);
    });

    it('should fail if invalid format header', async () => {
        const req = new NextRequest('http://localhost/api', {
            headers: { 'Authorization': 'Basic 123' }
        });
        const result = await authenticate(req);
        expect(result).toHaveProperty('error');
    });

    it('should fail if token not found in DB', async () => {
        const req = new NextRequest('http://localhost/api', {
            headers: { 'Authorization': 'Bearer invalid_token' }
        });
        mockFindUnique.mockResolvedValue(null);

        const result = await authenticate(req);
        expect(result).toHaveProperty('error');
        expect((result as any).error.status).toBe(401); // 401 for invalid token
    });

    it('should pass if token exists and active', async () => {
        const req = new NextRequest('http://localhost/api', {
            headers: { 'Authorization': 'Bearer valid_token' }
        });
        mockFindUnique.mockResolvedValue({ token: 'valid_token', name: 'Test', isActive: true });

        const result = await authenticate(req);
        expect(result).toHaveProperty('data');
    });

    it('should fail if token is inactive', async () => {
        const req = new NextRequest('http://localhost/api', {
            headers: { 'Authorization': 'Bearer disabled_token' }
        });
        mockFindUnique.mockResolvedValue({ token: 'disabled_token', isActive: false });

        const result = await authenticate(req);
        expect(result).toHaveProperty('error');
        expect((result as any).error.status).toBe(401);
    });
});
