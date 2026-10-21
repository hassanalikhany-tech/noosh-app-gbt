import { build } from 'esbuild';
import { resolve } from 'node:path';
const result = await build({ entryPoints: ['tests/scenarios.ts'], bundle: true, write: false, platform: 'node', format: 'esm', plugins: [{ name:'test-services', setup(builder) {
  builder.onResolve({filter:/^\.\.\/services\/(recipeService|userService)$/}, args => ({ path:resolve('tests',args.path.split('/').pop()+'.mock.ts') }));
} }] });
try {
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  const { strict: assert } = await import('node:assert');
  const { validRecipe } = await import('../netlify/functions/community-recipe-lib.mjs');
  const shareableRecipe = { id:'personal-test', name:'آش نمونه', category:'ash', description:'آش خانگی', ingredients:[{item:'عدس', amount:1, unit:'پیمانه'}], recipeSteps:['عدس را بپز.'], imageUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' };
  assert.equal(validRecipe(shareableRecipe), true, 'complete recipe with a supported image signature should be eligible for review');
  assert.equal(validRecipe({ ...shareableRecipe, category:'unknown' }), false, 'unsupported category must not enter the public queue');
  assert.equal(validRecipe({ ...shareableRecipe, ingredients:[] }), false, 'recipe without ingredients must not enter the public queue');
  assert.equal(validRecipe({ ...shareableRecipe, imageUrl:'data:image/svg+xml;base64,YQ==' }), false, 'active image content must not enter the public queue');
  assert.equal(validRecipe({ ...shareableRecipe, recipeSteps:[''] }), false, 'empty cooking instructions must not enter the public queue');
  console.log('Community recipe checks passed: consent-ready recipe schema, category, ingredients, steps and safe image formats.');
} catch (error) {
  console.error(`${error?.name || 'Error'}: ${error?.message || error}`);
  process.exitCode = 1;
}
