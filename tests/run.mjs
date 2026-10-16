import { build } from 'esbuild';
import { resolve } from 'node:path';
const result = await build({ entryPoints: ['tests/scenarios.ts'], bundle: true, write: false, platform: 'node', format: 'esm', plugins: [{ name:'test-services', setup(builder) {
  builder.onResolve({filter:/^\.\.\/services\/(recipeService|userService)$/}, args => ({ path:resolve('tests',args.path.split('/').pop()+'.mock.ts') }));
} }] });
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
