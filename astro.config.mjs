import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// UWAGA: `site` to placeholder — podmień na docelową domenę produkcyjną
// (potrzebne dla poprawnego canonical/hreflang/sitemap/RSS).
export default defineConfig({
  site: 'https://radekgrabarek.com',
  output: 'static',
  adapter: vercel(),
  // i18n Astro: EN domyślny BEZ prefiksu (`/`, `/[slug]`), PL Z prefiksem
  // (`/pl/`, `/pl/[slug]`). Każda strona = jedna wersja językowa na URL,
  // generowana osobno w getStaticPaths. Auto-wykrywanie języka przeglądarki
  // odbywa się tylko na stronie głównej `/` (mały skrypt inline → redirect na /pl/).
  i18n: {
    locales: ['en', 'pl'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', pl: 'pl' },
      },
    }),
  ],
  image: {
    // Obrazki (hero + okładki) to zewnętrzne URL-e renderowane wprost w <img>,
    // celowo NIE przez astro:assets/<Image> — optymalizacja zdalnych obrazów
    // obcych domen przy buildzie jest krucha. Jeśli kiedyś przejdziemy na
    // <Image />, trzeba dopisać dozwolone domeny tutaj:
    // domains: [],
  },
});
