import { build } from 'esbuild';
import { resolve } from 'node:path';
const result = await build({ entryPoints: ['tests/scenarios.ts'], bundle: true, write: false, platform: 'node', format: 'esm', plugins: [{ name:'test-services', setup(builder) {
  builder.onResolve({filter:/^\.\.\/services\/(recipeService|userService)$/}, args => ({ path:resolve('tests',args.path.split('/').pop()+'.mock.ts') }));
} }] });
try {
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  const { strict: assert } = await import('node:assert');
  const { validRecipe } = await import('../netlify/functions/community-recipe-lib.mjs');
  const { applyCatalogAction, validCatalogDish } = await import('../netlify/functions/catalog-management.mjs');
  const shareableRecipe = { id:'personal-test', name:'آش نمونه', category:'ash', description:'آش خانگی', ingredients:[{item:'عدس', amount:1, unit:'پیمانه'}], recipeSteps:['عدس را بپز.'], imageUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' };
  assert.equal(validRecipe(shareableRecipe), true, 'complete recipe with a supported image signature should be eligible for review');
  assert.equal(validRecipe({ ...shareableRecipe, category:'unknown' }), false, 'unsupported category must not enter the public queue');
  assert.equal(validRecipe({ ...shareableRecipe, ingredients:[] }), false, 'recipe without ingredients must not enter the public queue');
  assert.equal(validRecipe({ ...shareableRecipe, imageUrl:'data:image/svg+xml;base64,YQ==' }), false, 'active image content must not enter the public queue');
  assert.equal(validRecipe({ ...shareableRecipe, recipeSteps:[''] }), false, 'empty cooking instructions must not enter the public queue');
  const catalogDish = { id:'recipe_1', name:'آش نمونه', category:'ash', description:'آش خانگی', ingredients:[{item:'عدس', amount:1, unit:'پیمانه'}], recipeSteps:['بپز.'], isCommunityRecipe:true, creatorName:'آشپز' };
  assert.equal(validCatalogDish(catalogDish), true, 'complete catalog recipe can be managed');
  assert.equal(validCatalogDish({ ...catalogDish, ingredients:[] }), false, 'incomplete recipe cannot replace a published recipe');
  const editedCatalog = applyCatalogAction({ dishes:[catalogDish], hiddenDishIds:['recipe_1'] }, { action:'edit', dish:{ ...catalogDish, name:'آش ویرایش‌شده' } });
  assert.equal(editedCatalog.catalog.dishes[0].name, 'آش ویرایش‌شده', 'editing replaces the published catalog record');
  assert.equal(editedCatalog.catalog.dishes[0].creatorName, 'آشپز', 'editing preserves the community creator attribution');
  assert.deepEqual(editedCatalog.catalog.hiddenDishIds, [], 'editing a recipe restores it to the public catalog');
  const deletedCatalog = applyCatalogAction(editedCatalog.catalog, { action:'delete', dishId:'recipe_1' });
  assert.deepEqual(deletedCatalog.catalog.hiddenDishIds, ['recipe_1'], 'delete hides the recipe for every site visitor');
  const restoredCatalog = applyCatalogAction(deletedCatalog.catalog, { action:'restore', dishId:'recipe_1' });
  assert.deepEqual(restoredCatalog.catalog.hiddenDishIds, [], 'deleted recipes can be restored');
  console.log('Community recipe checks passed: consent-ready recipe schema, category, ingredients, steps and safe image formats.');
  console.log('Catalog management checks passed: validated edits, preserved attribution, public removal and restore.');
} catch (error) {
  console.error(`${error?.name || 'Error'}: ${error?.message || error}`);
  process.exitCode = 1;
}
