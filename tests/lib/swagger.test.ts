import { describe, it, expect } from 'vitest';
import { swaggerOptions } from '@/lib/swagger';

describe('Lib: Swagger', () => {
    describe('swaggerOptions', () => {
        it('should have valid OpenAPI version', () => {
            expect(swaggerOptions.definition).toBeDefined();
            expect(swaggerOptions.definition!.openapi).toBe('3.0.0');
        });

        it('should have complete info section', () => {
            const definition = swaggerOptions.definition!;
            expect(definition.info).toBeDefined();
            expect(definition.info.title).toBe('Chaster Service API');
            expect(definition.info.version).toBe('1.0.0');
            expect(definition.info.description).toBeDefined();
            expect(definition.info.contact).toBeDefined();
        });

        it('should define servers array', () => {
            const definition = swaggerOptions.definition!;
            const servers = definition.servers as Array<{ url: string; description: string }>;
            expect(Array.isArray(servers)).toBe(true);
            expect(servers.length).toBeGreaterThan(0);
            // Should have API server
            const apiServer = servers.find((s) =>
                s.description.includes('API Server')
            );
            expect(apiServer).toBeDefined();
            // Default assumes localhost if env not set
            expect(apiServer!.url).toContain('localhost');
        });

        it('should define BearerAuth security scheme', () => {
            const definition = swaggerOptions.definition!;
            const components = definition.components as {
                securitySchemes: {
                    BearerAuth: { type: string; scheme: string };
                };
            };
            expect(components.securitySchemes).toBeDefined();
            expect(components.securitySchemes.BearerAuth).toBeDefined();
            expect(components.securitySchemes.BearerAuth.type).toBe('http');
            expect(components.securitySchemes.BearerAuth.scheme).toBe('bearer');
        });

        it('should define Error schema', () => {
            const definition = swaggerOptions.definition!;
            const components = definition.components as {
                schemas: {
                    Error: { type: string; properties: { error: unknown } };
                };
            };
            expect(components.schemas.Error).toBeDefined();
            expect(components.schemas.Error.type).toBe('object');
            expect(components.schemas.Error.properties.error).toBeDefined();
        });

        it('should define Item schema with all required fields', () => {
            const definition = swaggerOptions.definition!;
            const components = definition.components as {
                schemas: {
                    Item: {
                        type: string;
                        properties: Record<string, { type?: string; enum?: string[] }>;
                    };
                };
            };
            expect(components.schemas.Item).toBeDefined();
            expect(components.schemas.Item.type).toBe('object');

            const props = components.schemas.Item.properties;
            expect(props.id).toBeDefined();
            expect(props.type).toBeDefined();
            expect(props.type.enum).toContain('text');
            expect(props.type.enum).toContain('image');
            expect(props.decryptAt).toBeDefined();
            expect(props.createdAt).toBeDefined();
            expect(props.unlocked).toBeDefined();
            expect(props.metadata).toBeDefined();
        });

        it('should have global security defined', () => {
            const definition = swaggerOptions.definition!;
            const security = definition.security as Array<{ BearerAuth?: unknown[] }>;
            expect(Array.isArray(security)).toBe(true);
            expect(security.length).toBeGreaterThan(0);
            expect(security[0]).toHaveProperty('BearerAuth');
        });

        it('should point to valid API docs path', () => {
            expect(swaggerOptions.apis).toBeDefined();
            expect(Array.isArray(swaggerOptions.apis)).toBe(true);
            expect(swaggerOptions.apis![0]).toContain('api/v1');
        });
    });
});
