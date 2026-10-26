const DISH_IMAGES_REPOSITORY = 'https://raw.githubusercontent.com/hassanalikhany-tech/noosh-app-gbt/main/public/images/dishes';
const PUBLIC_IMAGES_REPOSITORY = 'https://raw.githubusercontent.com/hassanalikhany-tech/noosh-app-gbt/main/public';

/** Image candidates in the same order used by dish cards and the recipe modal. */
export const getDishImageCandidates = (dishId?: string, imageUrl?: string): string[] => {
  const id = dishId?.trim();
  const url = imageUrl?.trim();
  if (url?.toLowerCase() === 'none') return [];
  const hasExplicitImage = Boolean(url && url.toLowerCase() !== 'none');
  if (!id) return hasExplicitImage ? [url!] : [];

  const candidates: string[] = [];
  const add = (candidate?: string) => {
    if (candidate && !candidates.includes(candidate)) candidates.push(candidate);
  };
  const extensions = ['webp', 'jpg', 'jpeg', 'png'];
  const isRepositoryUrl = (value: string) => value.startsWith('https://raw.githubusercontent.com/hassanalikhany-tech/noosh-app-gbt/');

  if (hasExplicitImage) {
    add(url);
    if (url!.startsWith('/') && !url!.startsWith('//')) {
      add(`${PUBLIC_IMAGES_REPOSITORY}${url}`);
      const pathWithoutExtension = url!.replace(/\.[a-z\d]+(?:[?#].*)?$/iu, '');
      extensions.forEach(extension => add(`${pathWithoutExtension}.${extension}`));
      extensions.forEach(extension => add(`${PUBLIC_IMAGES_REPOSITORY}${pathWithoutExtension}.${extension}`));
    } else if (isRepositoryUrl(url!)) {
      const pathWithoutExtension = url!.replace(/\.[a-z\d]+(?:[?#].*)?$/iu, '');
      extensions.forEach(extension => add(`${pathWithoutExtension}.${extension}`));
    }
  }

  for (const directory of ['/images/recipes', '/images/dishes']) {
    for (const extension of extensions) {
      const local = `${directory}/${id}.${extension}`;
      add(local);
      add(`${PUBLIC_IMAGES_REPOSITORY}${local}`);
    }
  }
  return candidates;
};
