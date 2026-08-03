import type { Prisma } from '@prisma/client';

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

export function toNumber(value: DecimalLike): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

const localeMap: Record<string, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
  uk: 'uk-UA'
};

export function formatMoney(
  value: DecimalLike,
  currency = 'TRY',
  locale = 'tr'
): string {
  const intlLocale = localeMap[locale] ?? 'tr-TR';
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency
    }).format(toNumber(value));
  } catch {
    return `${toNumber(value).toFixed(2)} ${currency}`;
  }
}

export function formatDate(value: Date | string, locale = 'tr'): string {
  const intlLocale = localeMap[locale] ?? 'tr-TR';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: 'medium'
  }).format(d);
}

export function formatDateTime(value: Date | string, locale = 'tr'): string {
  const intlLocale = localeMap[locale] ?? 'tr-TR';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(d);
}

/** For <input type="datetime-local"> default values. */
export function toDateTimeLocal(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
