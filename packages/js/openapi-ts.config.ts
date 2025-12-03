import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: '../../openapi/openapi.json',
  output: {
    path: 'src/generated',
    format: 'prettier',
    lint: 'eslint'
  },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    '@hey-api/client-fetch'
  ]
});
