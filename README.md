# radekgrabarek.com

Osobista strona / blog. Astro (SSG) + treść z Notion pobierana przy buildzie + hosting na Vercel z rebuildem przez webhook. Projekt siostrzany do Radek Reads v2 (ten sam stack).

## Stack

- **Astro** (`output: 'static'`) — czysty HTML, zero JS w runtime poza jednym małym skryptem auto-wykrywania języka na stronie głównej.
- **Notion** jako źródło treści (`@notionhq/client`), fetch wyłącznie przy buildzie (`src/lib/notion.ts`).
- **Vercel** (`@astrojs/vercel`) + Deploy Hook wyzwalany z Notion po zmianie w bazie.
- Czysty CSS (zmienne w `src/styles/global.css`), scoped `<style>` — szkielet gotowy do podmiany po design handoff.

## Dwujęzyczność (kluczowe)

Treść jest **niezależna per język** — artykuł może istnieć tylko po polsku, tylko po angielsku, albo w obu wersjach. Powiązanie wersji PL↔EN: kolumna **`Tłumaczenie`** (relacja) w bazie Notion.

Routing i18n:

| | 🇬🇧 Angielski (domyślny, bez prefiksu) | 🇵🇱 Polski (`/pl/`) |
|---|---|---|
| Strona główna | `/` | `/pl/` |
| Artykuł / podstrona | `/[slug]` | `/pl/[slug]` |
| RSS | `/rss.xml` | `/pl/rss.xml` |

- Slug generowany z tytułu, **osobno per język** (PL i EN mogą mieć różne slugi).
- **Auto-wykrywanie języka**: wejście na `/` z przeglądarką po polsku → przekierowanie na `/pl/` (mały skrypt inline, tylko na stronie głównej; wybór z przełącznika jest zapamiętywany, więc nie ma pętli). Każdy inny język → wersja angielska.
- Brak tłumaczenia = wersja pojawia się tylko w swoim języku, przełącznik jest ukryty.
- `hreflang` (pl/en/x-default) i `canonical` per URL, `sitemap` obejmuje obie ścieżki.

## Model danych (Notion → strona)

| Pole w Notion | Typ | Rola |
|---|---|---|
| Tytuł | title | tytuł + podstawa sluga |
| Język | select (Polski/Angielski) | wersja językowa |
| Format | select (blog post/podstrona/HP) | artykuł / strona statyczna / hero strony głównej |
| Status | select (Draft/Opublikowane) | **renderowane tylko „Opublikowane"** |
| Tłumaczenie | relation | powiązanie PL↔EN |
| Data publikacji | date | sortowanie + wyświetlanie |
| URL okładki | url | okładka artykułu / obrazek hero / OG |
| Kategoria, Tagi | multi_select | wczytywane do modelu (wygląd po design handoff) |
| treść strony (blocks) | — | właściwy tekst → HTML |

Lead na liście = automatycznie z pierwszego akapitu treści.

## Rozwój lokalny

```bash
npm install
# uzupełnij .env: NOTION_TOKEN i NOTION_DATABASE_ID (wzór w .env.example)
npm run dev      # podgląd na http://localhost:4321
npm run build    # statyczny dist/ (wymaga dostępu do Notion)
npm test         # testy jednostkowe (slugify, walidacja linków)
```

Build pobiera dane z Notion — błąd API przy buildzie jest traktowany jako błąd builda, nie stan runtime.

## Setup Notion → Vercel (rebuild po zmianie w bazie)

1. **Integracja Notion**: [notion.so/my-integrations](https://www.notion.so/my-integrations) → nowa integracja „Internal" → skopiuj **Internal Integration Token** (`ntn_…`) → to `NOTION_TOKEN`.
2. W bazie w Notion: `•••` → **Connections** → dodaj integrację (dostęp do odczytu).
3. `NOTION_DATABASE_ID` to 32-znakowy fragment URL-a bazy.
4. **Vercel**: zaimportuj repo jako projekt → **Settings → Environment Variables** → dodaj `NOTION_TOKEN` i `NOTION_DATABASE_ID` (Production + Preview).
5. **Deploy Hook**: **Settings → Git → Deploy Hooks** → utwórz hook (branch `main`) → skopiuj URL.
6. **Notion → Vercel**: Notion nie wysyła natywnie webhooków po edycji wiersza — użyj **Notion Automations** („Send webhook", jeśli plan pozwala) albo **Make/Zapier** (trigger „Notion: Database item updated" → akcja „Webhook POST" na URL Deploy Hooka).

**Świadomy kompromis**: treść odświeża się dopiero po rebuildzie (SSG), nie natychmiast — cena za zero JS i maksymalną szybkość na mobile.

## Struktura

```
src/
  lib/         notion.ts (getEntries), types.ts, slugify, sanitize-url,
               notion-blocks (render treści), youtube
  i18n/        dict.ts (etykiety UI PL/EN — tylko chrome, nie treść)
  layouts/     BaseLayout.astro (meta, hreflang, canonical, nawigacja)
  components/  HomeView, EntryView, ArticleCard, Cover, ContentBody
  pages/       index, [slug], pl/index, pl/[slug], rss.xml, pl/rss.xml
  styles/      global.css (zmienne CSS — placeholdery pod design)
```

## Do zrobienia później

- **Design handoff** — warstwa wizualna przyjdzie osobno; obecny CSS to celowy szkielet.
- Obrazki obce renderowane wprost w `<img>` (bez `astro:assets`) — jak w projekcie siostrzanym.
- Kategorie/Tagi są w modelu, ale jeszcze nie wyświetlane.
