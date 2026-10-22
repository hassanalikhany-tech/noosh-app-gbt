import { Dish, UserProfile } from '../types';
import { normalizePersian } from './text';
import { recipeCreatorKey } from './recipeCreators';
import { getCountryCodes, isDishProhibited } from './recipeHelpers';

const normalizeSearch = (value: string) => normalizePersian(value)
  .replace(/[ۀة]/g, 'ه')
  .replace(/[آأإ]/g, 'ا')
  .replace(/\s+/g, ' ')
  .trim();

const compact = (value: string) => normalizeSearch(value).replace(/[\s()\-–—]/g, '');

/** Exact character matching while ignoring ordinary and half-space differences. */
function exactSearchScore(query: string, text: string): number {
  const normalizedQuery = compact(query);
  const normalizedText = compact(text);
  if (!normalizedQuery || !normalizedText) return 0;
  const index = normalizedText.indexOf(normalizedQuery);
  if (index >= 0) return 130 - Math.min(20, index);
  const queryWords = normalizeSearch(query).split(' ').filter(Boolean).map(compact);
  return queryWords.length > 1 && queryWords.every(word => normalizedText.includes(word)) ? 90 : 0;
}

function nationalityAliases(dish: Dish): string[] {
  const nationality = normalizeSearch(dish.nationality || '');
  // Support a direct country/demonym search, without typo-tolerant matching.
  return nationality ? [nationality, `${nationality}ی`, `${nationality}یی`] : [];
}

function titleSearchText(dish: Dish): string {
  return [dish.name || '', ...nationalityAliases(dish)].join(' ');
}

/** Relevance score prioritizes the recipe name, then exact ingredient matches. */
export function scoreRecipeSearchDish(dish: Dish, searchTerm: string): number {
  const titleScore = exactSearchScore(searchTerm, titleSearchText(dish));
  const ingredientScore = Math.max(0, ...dish.ingredients.map(ingredient => exactSearchScore(searchTerm, ingredient.item)));
  return Math.max(titleScore, ingredientScore * 0.72) + (titleScore ? 35 : 0);
}

/** Live suggestions search recipe names only; whitespace and half-space are ignored. */
export function suggestRecipeNames(dishes: Dish[], searchTerm: string, limit = 6): Dish[] {
  if (compact(searchTerm).length < 2) return [];
  return dishes
    .map(dish => ({ dish, score: exactSearchScore(searchTerm, dish.name || '') }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || (a.dish.name || '').localeCompare(b.dish.name || '', 'fa'))
    .slice(0, limit)
    .map(result => result.dish);
}

export function filterRecipeSearchDishes(dishes: Dish[], filters: { searchTerm: string; selectedCreator: string; selectedCategory: string; selectedCountryId: string }, user: UserProfile, countries: { id: string; matches: string[] }[] = []): Dish[] {
  const { searchTerm, selectedCreator, selectedCategory, selectedCountryId } = filters;
  const normalizedSearch = normalizeSearch(searchTerm);
  const matchingDishes = dishes.filter(dish => {
    if (selectedCreator !== 'all' && recipeCreatorKey(dish) !== selectedCreator) return false;
    const titleAndCountryMatch = exactSearchScore(normalizedSearch, titleSearchText(dish)) > 0;
    const ingredientMatch = dish.ingredients.some(ingredient => exactSearchScore(normalizedSearch, ingredient.item) > 0);
    const matchesSearch = !normalizedSearch || titleAndCountryMatch || ingredientMatch;
    if (!matchesSearch) return false;
    const explicitlySearchedCustomRecipe = Boolean(normalizedSearch) &&
      (dish.isPersonal || dish.isCommunityRecipe) && exactSearchScore(normalizedSearch, dish.name || '') > 0;

    if (selectedCategory !== 'all' && dish.category !== selectedCategory) return false;

    if (selectedCategory === 'international' && selectedCountryId !== 'all') {
      const country = countries.find(c => c.id === selectedCountryId);
      if (!getCountryCodes(dish.nationality || '').includes(selectedCountryId) && !country?.matches.some(match => normalizeSearch(dish.nationality || '').includes(normalizeSearch(match)))) return false;
    }

    if (selectedCreator === 'all' && !explicitlySearchedCustomRecipe && isDishProhibited(dish, user)) return false;
    return true;
  });

  return normalizedSearch
    ? matchingDishes.sort((a, b) => scoreRecipeSearchDish(b, normalizedSearch) - scoreRecipeSearchDish(a, normalizedSearch))
    : matchingDishes;
}
