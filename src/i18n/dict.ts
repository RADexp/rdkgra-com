import type { Locale } from '../lib/types';

// Słownik WYŁĄCZNIE dla stałych elementów UI (nawigacja, stopka, przyciski).
// Treść artykułów pochodzi z Notion i NIE jest tłumaczona tutaj.
export const dict = {
  siteName: { en: 'Radek Grabarek', pl: 'Radek Grabarek' },
  nav_home: { en: 'Home', pl: 'Strona główna' },
  nav_blog: { en: 'Blog', pl: 'Blog' },
  readMore: { en: 'Read more', pl: 'Czytaj dalej' },
  latestPosts: { en: 'Latest posts', pl: 'Najnowsze wpisy' },
  noPosts: { en: 'No posts yet.', pl: 'Brak wpisów.' },
  publishedOn: { en: 'Published', pl: 'Opublikowano' },
  backToHome: { en: '← Home', pl: '← Strona główna' },
  // etykieta linku przełącznika = język, NA KTÓRY przełączamy
  switchToOther: { en: 'Polski', pl: 'English' },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, locale: Locale): string {
  return dict[key][locale];
}
