export type Locale = 'pl' | 'en';

// Format w Notion → typ wpisu w aplikacji.
// 'blog post' → article, 'podstrona' → page, 'HP' → home (hero strony głównej).
export type EntryType = 'article' | 'page' | 'home';

export interface ContentBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'quote' | 'code' | 'youtube';
  html?: string;
  items?: string[];
  youtubeId?: string;
  code?: string; // surowy tekst bloku code (bez HTML)
  lang?: string; // język bloku code (np. 'javascript')
}

export interface Entry {
  id: string; // Notion page id
  type: EntryType;
  locale: Locale;
  slug: string; // per-język, generowany z tytułu
  title: string;
  excerpt?: string; // auto: pierwszy akapit treści (lead na kafelku listy)
  cover?: string; // zewnętrzny URL z "URL okładki" (hero / okładka artykułu)
  publishedAt?: string; // ISO date z "Data publikacji"
  categories: string[]; // "Kategoria" (multi_select) — do modelu, wygląd później
  tags: string[]; // "Tagi" (multi_select) — jw.
  content: ContentBlock[]; // treść strony Notion (blocks) → HTML
  // Wersja w drugim języku (z relacji "Tłumaczenie"), o ile istnieje i jest
  // opublikowana. Steruje przełącznikiem języka i hreflang.
  translation?: { locale: Locale; slug: string; type: EntryType };
}
