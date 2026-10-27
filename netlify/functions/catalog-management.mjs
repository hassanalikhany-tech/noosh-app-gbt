import { recipeQuantityProblem } from '../../utils/quantitySanity.mjs';
const CATEGORIES = new Set(['ash', 'polo', 'khorak', 'stew', 'soup', 'fastfood', 'kabab', 'international', 'dessert']);
const DISH_ID = /^[\w-]{1,160}$/u;

export const validCatalogDish = (dish) => Boolean(
  dish && typeof dish === 'object' && DISH_ID.test(dish.id) &&
  typeof dish.name === 'string' && dish.name.trim().length > 0 && dish.name.length <= 120 &&
  CATEGORIES.has(dish.category) && typeof dish.description === 'string' && dish.description.length <= 3000 &&
  Array.isArray(dish.ingredients) && dish.ingredients.length > 0 && dish.ingredients.length <= 100 &&
  dish.ingredients.every(item => item && typeof item.item === 'string' && item.item.trim().length > 0 && item.item.length <= 160 && Number.isFinite(item.amount) && item.amount >= 0 && item.amount <= 100_000_000 && typeof item.unit === 'string' && item.unit.trim().length > 0 && item.unit.length <= 60) &&
  dish.ingredients.every(item => !recipeQuantityProblem(item, dish.servings)) &&
  Array.isArray(dish.recipeSteps) && dish.recipeSteps.length > 0 && dish.recipeSteps.length <= 100 &&
  dish.recipeSteps.every(step => typeof step === 'string' && step.trim().length > 0 && step.length <= 2000) &&
  (dish.nationality === undefined || typeof dish.nationality === 'string' && dish.nationality.length <= 100) &&
  (dish.imageUrl === undefined || typeof dish.imageUrl === 'string' && dish.imageUrl.length <= 2_000_000) &&
  (dish.servings === undefined || Number.isFinite(dish.servings) && dish.servings > 0 && dish.servings <= 1000) &&
  (dish.cookTime === undefined || Number.isFinite(dish.cookTime) && dish.cookTime >= 0 && dish.cookTime <= 10000) &&
  (dish.calories === undefined || Number.isFinite(dish.calories) && dish.calories >= 0 && dish.calories <= 100000)
);

const editableFields = [
  'id', 'name', 'category', 'description', 'ingredients', 'recipeSteps', 'imageUrl',
  'hasRealData', 'nationality', 'nature', 'mosleh', 'calories', 'cookTime', 'difficulty',
  'natureLabel', 'servings', 'imageReviewStatus', 'creatorName', 'creatorTitle', 'isCommunityRecipe'
];

export const sanitizeCatalogDish = (dish) => Object.fromEntries(
  editableFields.filter(key => Object.hasOwn(dish, key)).map(key => [key, dish[key]])
);

export const applyCatalogAction = (source, { action, dish, dishId }) => {
  const catalog = {
    version: 1,
    dishes: Array.isArray(source?.dishes) ? [...source.dishes] : [],
    hiddenDishIds: Array.isArray(source?.hiddenDishIds) ? [...new Set(source.hiddenDishIds.filter(id => typeof id === 'string'))] : []
  };

  if (action === 'edit') {
    if (!validCatalogDish(dish)) throw new Error('اطلاعات غذا ناقص یا نامعتبر است؛ نام، دسته، مواد و مراحل را بررسی کن.');
    const current = catalog.dishes.find(item => item?.id === dish.id);
    const updated = { ...current, ...sanitizeCatalogDish(dish), id: dish.id };
    if (current?.isCommunityRecipe) {
      updated.isCommunityRecipe = true;
      updated.creatorName = current.creatorName;
      updated.creatorTitle = current.creatorTitle;
    }
    catalog.dishes = [...catalog.dishes.filter(item => item?.id !== dish.id), updated];
    catalog.hiddenDishIds = catalog.hiddenDishIds.filter(id => id !== dish.id);
    return { catalog, changed: true, name: updated.name };
  }

  if (action !== 'delete' && action !== 'restore') throw new Error('عملیات مدیریت غذا معتبر نیست.');
  if (typeof dishId !== 'string' || !DISH_ID.test(dishId)) throw new Error('شناسهٔ غذا معتبر نیست.');
  const isHidden = catalog.hiddenDishIds.includes(dishId);
  if (action === 'delete' && !isHidden) {
    catalog.hiddenDishIds.push(dishId);
    return { catalog, changed: true, name: catalog.dishes.find(item => item?.id === dishId)?.name || '' };
  }
  if (action === 'restore' && isHidden) {
    catalog.hiddenDishIds = catalog.hiddenDishIds.filter(id => id !== dishId);
    return { catalog, changed: true, name: catalog.dishes.find(item => item?.id === dishId)?.name || '' };
  }
  return { catalog, changed: false, name: catalog.dishes.find(item => item?.id === dishId)?.name || '' };
};
