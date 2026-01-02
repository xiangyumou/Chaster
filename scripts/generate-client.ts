import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerOptions } from '../src/lib/swagger';
import { generate } from 'openapi-typescript-codegen';
import path from 'path';
import fs from 'fs';

async function generateClient() {
    console.log('🔍 Generating Swagger Spec...');
    const spec = swaggerJsdoc(swaggerOptions);

    // Ensure public directory exists if we want to save it there too (optional)
    const publicDir = path.resolve(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    // Write spec to file for debugging/usage
    const specPath = path.resolve(process.cwd(), 'public', 'swagger.json');
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
    console.log(`✅ Swagger Spec written to ${specPath}`);

    console.log('⚙️  Generating Client SDK...');
    await generate({
        input: spec, // Pass the object directly
        output: path.resolve(process.cwd(), 'sdk'),
        // @ts-expect-error - 'client' is valid at runtime but missing in types
        client: 'fetch', // Use standard fetch
        useOptions: true,
        useUnionTypes: true,
        exportCore: true,
        exportServices: true,
        exportModels: true,
        exportSchemas: true,
    });

    console.log('✅ Client SDK generated in /sdk');
}

generateClient().catch(console.error);
