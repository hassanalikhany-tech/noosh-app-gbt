type CommunityCreator = { creatorName?: string; creatorTitle?: 'lady' | 'gentleman' | 'none' };

export const formatCommunityAttribution = ({ creatorName, creatorTitle }: CommunityCreator): string => {
  if (!creatorName?.trim()) return '';
  const name = creatorName.trim();
  const contributor = creatorTitle === 'lady'
    ? `کاربر محترم سرکار خانم ${name}`
    : creatorTitle === 'gentleman'
      ? `کاربر محترم جناب آقای ${name}`
      : `کاربر محترم «${name}»`;
  return `این رسپی توسط ${contributor} تهیه و جهت استفادهٔ عموم تقدیم شده است.`;
};
