/**
 * Sync OpenAPI specification from EmitKit API
 *
 * Fetches the latest OpenAPI spec and saves it locally for SDK generation
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';

const OPENAPI_URLS = {
  production: 'https://api.emitkit.com/api/openapi.json',
  development: 'http://localhost:5173/api/openapi.json'
};

async function syncOpenAPI() {
  const env = process.env.ENV || 'production';
  const url = env === 'development' ? OPENAPI_URLS.development : OPENAPI_URLS.production;

  console.log(`📡 Syncing OpenAPI spec from ${env}...`);
  console.log(`   URL: ${url}\n`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const spec = await response.json();

    // Validate basic structure
    if (!spec.openapi || !spec.info || !spec.paths) {
      throw new Error('Invalid OpenAPI specification format');
    }

    // Save to file
    const outputPath = join(process.cwd(), 'openapi', 'openapi.json');
    await writeFile(outputPath, JSON.stringify(spec, null, 2), 'utf-8');

    console.log('✅ OpenAPI spec synced successfully!');
    console.log(`   Version: ${spec.info.version}`);
    console.log(`   Title: ${spec.info.title}`);
    console.log(`   Endpoints: ${Object.keys(spec.paths).length}`);
    console.log(`   Saved to: ${outputPath}\n`);
  } catch (error) {
    console.error('❌ Failed to sync OpenAPI spec:');
    if (error instanceof Error) {
      console.error(`   ${error.message}\n`);
    }
    process.exit(1);
  }
}

syncOpenAPI();
