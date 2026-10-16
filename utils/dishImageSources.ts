const DISH_IMAGES_REPOSITORY = 'https://raw.githubusercontent.com/hassanalikhany-tech/noosh-app/main/public/images/dishes';

/** Image candidates in the same order used by dish cards and the recipe modal. */
export const getDishImageCandidates = (dishId?: string, imageUrl?: string): string[] => {
  const id = dishId?.trim();
  const url = imageUrl?.trim();
  if (url?.toLowerCase() === 'none') return [];
  const hasExplicitImage = Boolean(url && url.toLowerCase() !== 'none');
  if (!id) return hasExplicitImage ? [url!] : [];

  if (!hasExplicitImage) {
    return ['png', 'jpg', 'jpeg'].map(extension => `${DISH_IMAGES_REPOSITORY}/${id}.${extension}`);
  }

  const isGitHubImage = url.includes('raw.githubusercontent.com');
  const fallbackBase = isGitHubImage
    ? `${DISH_IMAGES_REPOSITORY}/${id}`
    : `/images/dishes/${id}`;
  return [url, `${fallbackBase}.jpg`, `${fallbackBase}.jpeg`];
};
