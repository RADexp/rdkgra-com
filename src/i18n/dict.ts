import type { Locale } from '../lib/types';

// Słownik WYŁĄCZNIE dla stałych elementów UI (nawigacja, stopka, przyciski).
// Treść artykułów pochodzi z Notion i NIE jest tłumaczona tutaj.
export const dict = {
  siteName: { en: 'Radek Grabarek', pl: 'Radek Grabarek' },
  nav_home: { en: 'Home', pl: 'Strona główna' },
  nav_blog: { en: 'Blog', pl: 'Blog' },
  navWriting: { en: 'Writing', pl: 'Teksty' },
  readMore: { en: 'Read more', pl: 'Czytaj dalej' },
  latestPosts: { en: 'Recent essays & build logs', pl: 'Najnowsze eseje i dzienniki' },
  noPosts: { en: 'No posts yet.', pl: 'Brak wpisów.' },
  publishedOn: { en: 'Published', pl: 'Opublikowano' },
  backToHome: { en: '← Home', pl: '← Strona główna' },
  backToWriting: { en: '← Writing', pl: '← Teksty' },
  authorTagline: { en: 'learning in public', pl: 'nauka na żywo' },
  minRead: { en: 'MIN READ', pl: 'MIN CZYTANIA' },
  shareThis: { en: 'Share this', pl: 'Udostępnij' },
  shareOnX: { en: 'Share on X', pl: 'Udostępnij na X' },
  shareOnLinkedIn: { en: 'Share on LinkedIn', pl: 'Udostępnij na LinkedIn' },
  copyLink: { en: 'Copy link', pl: 'Skopiuj link' },
  copiedLink: { en: 'Link copied', pl: 'Skopiowano link' },
  // karta zapisu na newsletter na dole artykułu
  nlCardEyebrow: { en: 'Liked this one?', pl: 'Spodobało się?' },
  nlCardHeading: {
    en: 'Get the next letter in your inbox.',
    pl: 'Dostań kolejny list na maila.',
  },
  // hero + formularz zapisu do newslettera
  heroTagline: { en: 'A field notebook · learning in public', pl: 'Notatnik terenowy · nauka na żywo' },
  subscribePlaceholder: { en: 'Your email to follow along', pl: 'Twój e-mail, żeby śledzić' },
  subscribeCta: { en: 'Subscribe →', pl: 'Zapisz się →' },
  subscribeNote: {
    en: 'one letter a week · unsubscribe anytime',
    pl: 'jeden list tygodniowo · wypisz się w każdej chwili',
  },
  subscribeLoading: { en: 'Adding you…', pl: 'Dodaję Cię…' },
  subscribeOk: {
    en: "You're on the list — thank you!",
    pl: 'Jesteś na liście — dziękuję!',
  },
  subscribeAlready: {
    en: 'You were already subscribed — thanks!',
    pl: 'Już byłeś zapisany — dzięki!',
  },
  subscribeInvalid: {
    en: 'Please enter a valid email.',
    pl: 'Podaj proszę poprawny adres e-mail.',
  },
  subscribeError: {
    en: 'Something went wrong — please try again.',
    pl: 'Coś poszło nie tak — spróbuj ponownie.',
  },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, locale: Locale): string {
  return dict[key][locale];
}
