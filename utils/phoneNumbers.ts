import { englishDigits } from './text';

/** Accept E.164 numbers, 00-prefixed international numbers, and Iranian mobile numbers. */
export const normalizePhoneNumber = (input: string): string | null => {
  let value = englishDigits(input.trim()).replace(/[\s().-]/g, '');
  if (!value || !/^\+?[0-9]+$/.test(value)) return null;

  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  else if (value.startsWith('09') && value.length === 11) value = `+98${value.slice(1)}`;
  else if (value.startsWith('9') && value.length === 10) value = `+98${value}`;

  if (!value.startsWith('+')) return null;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
};

/** Preserve legacy Iranian Firestore IDs while using E.164 for Firebase Auth. */
export const getPhoneUserDocumentIds = (e164Phone: string): string[] => {
  if (/^\+989\d{9}$/.test(e164Phone)) return [`0${e164Phone.slice(3)}`, e164Phone];
  return [e164Phone];
};
