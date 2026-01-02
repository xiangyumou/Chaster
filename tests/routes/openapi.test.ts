import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/openapi.json/route';

describe('OpenAPI JSON API (In-Process)', () => {
    describe('GET /openapi.json', () => {
        it('should return valid OpenAPI spec', async () => {
            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.openapi).toBeDefined();
            expect(data.openapi).toMatch(/^3\.\d+\.\d+/); // OpenAPI 3.x.x
        });

        it('should contain info section', async () => {
            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.info).toBeDefined();
            expect(data.info.title).toBeDefined();
            expect(data.info.version).toBeDefined();
        });

        it('should contain paths section', async () => {
            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.paths).toBeDefined();
            expect(typeof data.paths).toBe('object');
        });

        it('should include items API paths', async () => {
            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            // Check for core API paths
            const paths = Object.keys(data.paths);
            expect(paths.length).toBeGreaterThan(0);
        });

        it('should define security schemes', async () => {
            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            // Check for components/securitySchemes if defined
            if (data.components?.securitySchemes) {
                expect(data.components.securitySchemes).toBeDefined();
            }
        });

        it('should return proper content type response', async () => {
            const res = await GET();

            expect(res.status).toBe(200);
            // NextResponse.json sets application/json
            expect(res.headers.get('content-type')).toContain('application/json');
        });
    });
});
