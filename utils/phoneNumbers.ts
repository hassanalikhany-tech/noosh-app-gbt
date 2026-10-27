import { englishDigits } from './text';

/** Keep the international prefix visible while users type or paste a phone number. */
export const formatPhoneNumberInput = (input: string): string => {
  const compact = englishDigits(input.trim()).replace(/[^\d+]/g, '');
  const digits = compact.replace(/\+/g, '').replace(/^00/, '');
  return `+${digits}`;
};

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