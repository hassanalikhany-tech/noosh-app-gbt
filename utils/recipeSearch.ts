import { Dish, UserProfile } from '../types';
import { normalizePersian } from './text';
import { recipeCreatorKey } from './recipeCreators';
import { getCountryCodes, isDishProhibited } from './recipeHelpers';

export function filterRecipeSearchDishes(dishes: Dish[], filters: { searchTerm: string; selectedCreator: string; selectedCategory: string; selectedCountryId: string }, user: UserProfile, countries: { id: string; matches: string[] }[] = []): Dish[] {
  const { searchTerm, selectedCreator, selectedCategory, selectedCountryId } = filters;
    return dishes.filter(dish => {
      if (selectedCreator !== 'all' && recipeCreatorKey(dish) !== selectedCreator) return false;
      const name = dish.name || "";
      const searchable = normalizePersian([name, dish.creatorName || '', dish.description, ...dish.ingredients.map(i => i.item)].join(' '));
      const matchesSearch = normalizePersian(searchTerm).split(' ').filter(Boolean).every(word => searchable.includes(word));
      if (!matchesSearch) return false;
      
      if (selectedCategory !== 'all' && dish.category !== selectedCategory) return false;
      
      if (selectedCategory === 'international' && selectedCountryId !== 'all') {
        const country = countries.find(c => c.id === selectedCountryId);
        if (!getCountryCodes(dish.nationality || '').includes(selectedCountryId) && !country?.matches.some(match => normalizePersian(dish.nationality || '').includes(normalizePersian(match)))) return false;
      }

      // Filter prohibited ingredients
      if (selectedCreator === 'all' && isDishProhibited(dish, user)) return false;

      return true;
    });
}
