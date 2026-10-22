import { Dish, UserProfile } from '../types';
import { normalizePersian } from './text';
import { recipeCreatorKey } from './recipeCreators';
import { getCountryCodes, isDishProhibited } from './recipeHelpers';

const normalizeSearch = (value: string) => normalizePersian(value)
  .replace(/[ۀة]/g, 'ه')
  .replace(/[آأإ]/g, 'ا')
  .replace(/\s+/g, ' ')
  .trim();

const compact = (value: string) => normalizeSearch(value).replace(/\s/g, '');

/** Bounded Damerau-Levenshtein distance; adjacent swapped letters are common typos. */
function editDistance(left: string, right: string, limit: number): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  const rows = Array.from({ length: left.length + 1 }, (_, index) => index);
  let previousPrevious: number[] | undefined;
  let previous = rows;

  for (let i = 1; i <= right.length; i++) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= left.length; j++) {
      const cost = left[j - 1] === right[i - 1] ? 0 : 1;
      let value = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && left[j - 1] === right[i - 2] && left[j - 2] === right[i - 1]) {
        value = Math.min(value, (previousPrevious?.[j - 2] ?? limit + 1) + 1);
      }
      current[j] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > limit) return limit + 1;
    previousPrevious = previous;
    previous = current;
  }
  return previous[left.length];
}

function maxTypoDistance(query: string): number {
  if (query.length < 3) return 0;
  if (query.length <= 5) return 1;
  return Math.min(2, Math.floor(query.length * 0.22));
}

/** Match a typed fragment against a word, allowing a small number of typos. */
function wordMatchScore(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (candidate === query) return 120;
  if (candidate.startsWith(query)) return 112 - Math.min(10, candidate.length - query.length);
  if (candidate.includes(query)) return 100 - Math.min(10, candidate.indexOf(query));

  const limit = maxTypoDistance(query);
  if (!limit) return 0;

  // Compare against candidate substrings so a partial final word remains useful.
  let best = limit + 1;
  const minLength = Math.max(1, query.length - limit);
  const maxLength = Math.min(candidate.length, query.length + limit);
  for (let length = minLength; length <= maxLength; length++) {
    for (let start = 0; start + length <= candidate.length; start++) {
      best = Math.min(best, editDistance(query, candidate.slice(start, start + length), limit));
      if (best === 0) break;
    }
    if (best === 0) break;
  }
  return best <= limit ? 72 - best * 14 : 0;
}

function scoreAgainstText(query: string, text: string): number {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return 0;
  const normalizedText = normalizeSearch(text);
  const queryCompact = normalizedQuery.replace(/\s/g, '');
  const textCompact = normalizedText.replace(/\s/g, '');
  if (textCompact.includes(queryCompact)) return 130 - Math.min(20, textCompact.indexOf(queryCompact));
  // The compact fuzzy path is for joined input versus a recipe title. Avoid
  // comparing it to an entire description/ingredient index on every keystroke.
  if (!normalizedQuery.includes(' ') && textCompact.length <= queryCompact.length + 8) {
    const compactScore = wordMatchScore(queryCompact, textCompact);
    if (compactScore > 0) return compactScore - 8;
  }

  const queryWords = normalizedQuery.split(' ').filter(Boolean);
  const textWords = normalizedText.split(' ').filter(Boolean);
  const wordScores = queryWords.map(word => Math.max(0, ...textWords.map(candidate => wordMatchScore(word, candidate))));
  if (wordScores.some(score => score === 0)) return 0;
  return wordScores.reduce((sum, score) => sum + score, 0) / wordScores.length;
}

function searchableParts(dish: Dish): string[] {
  const nationality = normalizeSearch(dish.nationality || '');
  // People often search with a demonym (e.g. «پاکستانی») while the recipe record stores the country name.
  const nationalitySearchTerms = nationality ? [nationality, `${nationality}ی`, `${nationality}یی`] : [];
  return [dish.name || '', dish.creatorName || '', dish.description || '', ...nationalitySearchTerms, ...dish.ingredients.map(ingredient => ingredient.item)];
}

/** Relevance score used for both live title suggestions and the full result list. */
export function scoreRecipeSearchDish(dish: Dish, searchTerm: string): number {
  const titleScore = scoreAgainstText(searchTerm, dish.name || '');
  const otherScores = searchableParts(dish).slice(1).map(part => scoreAgainstText(searchTerm, part));
  const otherScore = Math.max(0, ...otherScores);
  return Math.max(titleScore, otherScore * 0.72) + (titleScore ? 35 : 0);
}

/** Top live suggestions are title-first; ingredients and descriptions do not pollute name suggestions. */
export function suggestRecipeNames(dishes: Dish[], searchTerm: string, limit = 6): Dish[] {
  const query = normalizeSearch(searchTerm);
  if (compact(query).length < 2) return [];
  return dishes
    .map(dish => ({ dish, score: scoreAgainstText(query, dish.name || '') }))
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
    const name = normalizeSearch(dish.name || '');
    const parts = searchableParts(dish);
    const queryWords = normalizedSearch.split(' ').filter(Boolean);
    const matchesSearch = !normalizedSearch || parts.some(part => scoreAgainstText(normalizedSearch, part) > 0) ||
      (queryWords.length > 1 && queryWords.every(word => parts.some(part => scoreAgainstText(word, part) > 0)));
    if (!matchesSearch) return false;
    const explicitlySearchedCustomRecipe = Boolean(normalizedSearch) &&
      (dish.isPersonal || dish.isCommunityRecipe) && scoreAgainstText(normalizedSearch, name) > 0;

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
