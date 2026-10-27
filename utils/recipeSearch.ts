import { Dish, UserProfile } from '../types';
import { normalizePersian } from './text';
import { recipeCreatorKey } from './recipeCreators';
import { getCountryCodes } from './recipeHelpers';

const normalizeSearch = (value: string) => normalizePersian(value)
  .replace(/[ۀة]/g, 'ه')
  .replace(/[آأإ]/g, 'ا')
  .replace(/\s+/g, ' ')
  .trim();

const compact = (value: string) => normalizeSearch(value).replace(/[\s()\-–—]/g, '');

type SearchQuery = { compact: string; words: string[] };
const compileQuery = (value: string): SearchQuery => ({ compact: compact(value), words: normalizeSearch(value).split(' ').filter(Boolean).map(compact) });

/** Exact character matching while ignoring ordinary and half-space differences. */
function exactSearchScore(query: SearchQuery, normalizedText: string): number {
  if (!query.compact || !normalizedText) return 0;
  const index = normalizedText.indexOf(query.compact);
  if (index >= 0) return 130 - Math.min(20, index);
  return query.words.length > 1 && query.words.every(word => normalizedText.includes(word)) ? 90 : 0;
}

function nationalityAliases(dish: Dish): string[] {
  const nationality = normalizeSearch(dish.nationality || '');
  // Support a direct country/demonym search, without typo-tolerant matching.
  return nationality ? [nationality, `${nationality}ی`, `${nationality}یی`] : [];
}

function titleSearchText(dish: Dish): string {
  return [dish.name || '', ...nationalityAliases(dish)].join(' ');
}

const searchDocuments = new WeakMap<Dish, { name: string; nationality?: string; ingredients: Dish['ingredients']; title: string; nameText: string; ingredientTexts: string[] }>();
function searchDocument(dish: Dish) {
  let document = searchDocuments.get(dish);
  if (!document || document.name !== dish.name || document.nationality !== dish.nationality || document.ingredients !== dish.ingredients) {
    document = { name: dish.name, nationality: dish.nationality, ingredients: dish.ingredients, title: compact(titleSearchText(dish)), nameText: compact(dish.name || ''), ingredientTexts: dish.ingredients.map(ingredient => compact(ingredient.item)) };
    searchDocuments.set(dish, document);
  }
  return document;
}
function scoreDocument(query: SearchQuery, document: ReturnType<typeof searchDocument>): number {
  const titleScore = exactSearchScore(query, document.title);
  const ingredientScore = Math.max(0, ...document.ingredientTexts.map(text => exactSearchScore(query, text)));
  return Math.max(titleScore, ingredientScore * 0.72) + (titleScore ? 35 : 0);
}

/** Relevance score prioritizes the recipe name, then exact ingredient matches. */
export function scoreRecipeSearchDish(dish: Dish, searchTerm: string): number {
  return scoreDocument(compileQuery(searchTerm), searchDocument(dish));
}

/** Live suggestions search recipe names only; whitespace and half-space are ignored. */
export function suggestRecipeNames(dishes: Dish[], searchTerm: string, limit = 6): Dish[] {
  const query = compileQuery(searchTerm);
  if (query.compact.length < 2) return [];
  return dishes
    .map(dish => ({ dish, score: exactSearchScore(query, searchDocument(dish).nameText) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || (a.dish.name || '').localeCompare(b.dish.name || '', 'fa'))
    .slice(0, limit)
    .map(result => result.dish);
}

export function filterRecipeSearchDishes(dishes: Dish[], filters: { searchTerm: string; selectedCreator: string; selectedCategory: string; selectedCountryId: string }, _user: UserProfile, countries: { id: string; matches: string[] }[] = []): Dish[] {
  const { searchTerm, selectedCreator, selectedCategory, selectedCountryId } = filters;
  const normalizedSearch = normalizeSearch(searchTerm);
  const query = compileQuery(normalizedSearch);
  const scores = new Map<Dish, number>();
  const matchingDishes = dishes.filter(dish => {
    if (selectedCreator !== 'all' && recipeCreatorKey(dish) !== selectedCreator) return false;
    if (normalizedSearch) {
      const score = scoreDocument(query, searchDocument(dish));
      if (!score) return false;
      scores.set(dish, score);
    }
    if (selectedCategory !== 'all' && dish.category !== selectedCategory) return false;

    if (selectedCategory === 'international' && selectedCountryId !== 'all') {
      const country = countries.find(c => c.id === selectedCountryId);
      if (!getCountryCodes(dish.nationality || '').includes(selectedCountryId) && !country?.matches.some(match => normalizeSearch(dish.nationality || '').includes(normalizeSearch(match)))) return false;
    }

    // Catalog browsing remains complete; MealCard displays dietary warnings.
    return true;
  });

  return normalizedSearch
    ? matchingDishes.sort((a, b) => scores.get(b)! - scores.get(a)!)
    : matchingDishes;
}
