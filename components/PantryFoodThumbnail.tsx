import React from 'react';
import { PANTRY_ITEMS } from '../data/pantry';

type Props = { item: string; categoryId?: string; subcategoryId?: string };

const palettes: Record<string, { tile: string; accent: string }> = {
  proteins: { tile: '#f8eee9', accent: '#d9aa96' },
  dairy: { tile: '#edf4f3', accent: '#a8cbc5' },
  grains: { tile: '#f6f1df', accent: '#ddc87f' },
  vegetables: { tile: '#edf4e8', accent: '#a9c98e' },
  additives: { tile: '#f4eee6', accent: '#d8b98c' },
};

function glyphFor(item: string, categoryId: string, subcategoryId: string): string {
  const name = item.replace(/[\s\u200c\u200bـ()،/.-]/g, '');
  const matches: [string, string][] = [
    ['تخممرغ', '🥚'], ['اردک', '🦆'], ['بلدرچین', '🐦'], ['بوقلمون', '🦃'], ['میگو', '🦐'], ['ماهی', '🐟'], ['تنماهی', '🐟'], ['توفو', '🧈'],
    ['سوسیس', '🌭'], ['کالباس', '🥓'], ['سیرابی', '🥩'], ['کلهوپاچه', '🍖'], ['جگر', '🥩'], ['پاچه', '🍖'], ['مرغ', '🍗'], ['گوشت', '🥩'],
    ['شیر', '🥛'], ['خامه', '🥛'], ['کره', '🧈'], ['پنیر', '🧀'], ['ماست', '🥣'], ['دوغ', '🥛'], ['کشک', '🥣'],
    ['برنج', '🍚'], ['لوبیا', '🫘'], ['عدس', '🫘'], ['لپه', '🫘'], ['ماش', '🫘'], ['نخود', '🫘'], ['باقالی', '🫛'], ['گندم', '🌾'], ['بلغور', '🌾'], ['جو', '🌾'], ['غلات', '🥣'], ['آرد', '🌾'], ['ترخینه', '🍲'], ['رشته', '🍜'], ['پاستا', '🍝'], ['ماکارونی', '🍝'], ['نان', '🍞'],
    ['بادمجان', '🍆'], ['بامیه', '🥬'], ['آواکادو', '🥑'], ['آووکادو', '🥑'], ['انار', '🍎'], ['تربچه', '🌱'], ['چغندر', '🫜'], ['سیبزمینی', '🥔'], ['پیاز', '🧅'], ['سیر', '🧄'], ['شلغم', '🫜'], ['هویج', '🥕'], ['گوجه', '🍅'], ['خیار', '🥒'], ['ذرت', '🌽'], ['ریحان', '🌿'], ['اسفناج', '🥬'], ['سبزی', '🌿'], ['تره', '🌿'], ['جعفری', '🌿'], ['ترخون', '🌿'], ['شوید', '🌿'], ['گشنیز', '🌿'], ['شنبلیله', '🌿'], ['نعنا', '🌿'], ['مرزه', '🌿'], ['فلفلدلمه', '🫑'], ['فلفل', '🌶️'], ['قارچ', '🍄'], ['کدوحلوایی', '🎃'], ['کدو', '🥒'], ['لوبیاسبز', '🫛'], ['مارچوبه', '🥬'], ['نخودفرنگی', '🫛'], ['کرفس', '🥬'], ['کلم', '🥬'], ['گلکلم', '🥦'], ['بروکلی', '🥦'], ['کنگر', '🌿'], ['لیمو', '🍋'], ['زیتون', '🫒'], ['به', '🍐'], ['ریواس', '🌿'], ['شور', '🥒'],
    ['زعفران', '🌼'], ['آویشن', '🌿'], ['ادویه', '🧂'], ['دارچین', '🪵'], ['زردچوبه', '🟡'], ['زیره', '🌰'], ['سماق', '🫙'], ['نمک', '🧂'], ['فلفلسياه', '🧂'], ['فلفلقرمز', '🌶️'], ['پاپریکا', '🌶️'], ['هل', '🌱'], ['پودر', '🧄'], ['آبلیمو', '🍋'], ['آبغوره', '🍇'], ['آبنارنج', '🍊'], ['روغن', '🫒'], ['سرکه', '🫙'], ['رب', '🍅'], ['تمر', '🟤'], ['جوششیرین', '🧂'], ['بیکینگپودر', '🧁'], ['پوستپرتقال', '🍊'], ['ژلاتین', '🟡'], ['سسسویا', '🫙'], ['نشاسته', '🌾'], ['آلوبخارا', '🫐'], ['بادام', '🥜'], ['پسته', '🥜'], ['گردو', '🌰'], ['زرشک', '🫐'], ['غوره', '🍇'], ['شکر', '🍬'], ['شیره', '🍯'], ['عسل', '🍯'], ['قند', '🍬'], ['گلاب', '🌹'],
  ];
  const found = [...matches].sort((a, b) => b[0].length - a[0].length).find(([needle]) => name.includes(needle));
  if (found) return found[1];

  const groupFallbacks: Record<string, string> = {
    'proteins-meat': '🥩', 'proteins-seafood': '🐟', 'proteins-eggs': '🥚', 'proteins-ready': '🥓',
    'dairy-milk': '🥛', 'dairy-cheese': '🧀', 'dairy-fermented': '🥣',
    'grains-legumes': '🫘', 'grains-rice': '🌾', 'grains-flour': '🌾', 'grains-bread-pasta': '🍞',
    'vegetables-leafy': '🌿', 'vegetables-roots': '🥕', 'vegetables-fruiting': '🥬', 'vegetables-fruit': '🍎', 'vegetables-cabbage': '🥬',
    'additives-spices': '🧂', 'additives-oils': '🫒', 'additives-sauces': '🫙', 'additives-nuts': '🥜', 'additives-sweet': '🍯',
  };
  return groupFallbacks[subcategoryId] || (categoryId === 'proteins' ? '🥩' : categoryId === 'dairy' ? '🥛' : categoryId === 'grains' ? '🌾' : categoryId === 'vegetables' ? '🥬' : '🧂');
}

export default function PantryFoodThumbnail({ item, categoryId: suppliedCategoryId, subcategoryId: suppliedSubcategoryId }: Props) {
  const matchedCategory = PANTRY_ITEMS.find(category => category.items.includes(item));
  const categoryId = suppliedCategoryId || matchedCategory?.id || 'vegetables';
  const subcategoryId = suppliedSubcategoryId || matchedCategory?.subcategories.find(group => group.items.includes(item))?.id || '';
  const palette = palettes[categoryId] || palettes.vegetables;
  const glyph = glyphFor(item, categoryId, subcategoryId);
  return <svg className="pantry-food-thumbnail" viewBox="0 0 40 40" aria-hidden="true">
    <rect x="0.5" y="0.5" width="39" height="39" rx="12" fill={palette.tile} stroke={palette.accent} />
    <circle cx="31" cy="9" r="3" fill={palette.accent} opacity=".65" />
    <text x="20" y="27" textAnchor="middle" fontSize="21" fontFamily="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">{glyph}</text>
  </svg>;
}
