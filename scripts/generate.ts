/**
 * Generate all SDKs from OpenAPI specification
 *
 * Runs the code generators for each SDK package
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

const SDK_PACKAGES = [
  {
    name: 'JavaScript/TypeScript',
    path: 'packages/js',
    command: 'pnpm run generate'
  }
];

async function generateSDKs() {
  console.log('🔨 Generating SDKs from OpenAPI spec...\n');

  // Check if OpenAPI spec exists
  const specPath = join(process.cwd(), 'openapi', 'openapi.json');
  if (!existsSync(specPath)) {
    console.error('❌ OpenAPI spec not found!');
    console.error('   Run `pnpm run sync` first to fetch the spec.\n');
    process.exit(1);
  }

  let successCount = 0;
  let failureCount = 0;

  for (const sdk of SDK_PACKAGES) {
    console.log(`📦 Generating ${sdk.name} SDK...`);

    try {
      const { stdout, stderr } = await execAsync(sdk.command, {
        cwd: join(process.cwd(), sdk.path)
      });

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      console.log(`✅ ${sdk.name} SDK generated successfully!\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to generate ${sdk.name} SDK:`);
      if (error instanceof Error) {
        console.error(`   ${error.message}\n`);
      }
      failureCount++;
    }
  }

  console.log('─'.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📦 Total: ${SDK_PACKAGES.length}\n`);

  if (failureCount > 0) {
    process.exit(1);
  }
}

generateSDKs();
