import type { Locale } from './types';

// Wartości pola Notion "Etap projektu" (select) — dopasowanie bez rozróżniania
// wielkości liter, bo Radek wpisuje je ręcznie w Notion (np. "In Progress").
// Wartość spoza tego zestawu po prostu pokazuje się surowo (patrz stageLabel/stageDot).
export const PROJECT_STAGES = ['Shipped', 'In progress', 'Paused', 'Archived'] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

const LABELS: Record<ProjectStage, { en: string; pl: string }> = {
  Shipped: { en: 'Shipped', pl: 'Wydany' },
  'In progress': { en: 'In progress', pl: 'W trakcie' },
  Paused: { en: 'Paused', pl: 'Wstrzymany' },
  Archived: { en: 'Archived', pl: 'Zarchiwizowany' },
};

const DOTS: Record<ProjectStage, string> = {
  Shipped: '●',
  'In progress': '◐',
  Paused: '◌',
  Archived: '○',
};

const SLUGS: Record<ProjectStage, string> = {
  Shipped: 'shipped',
  'In progress': 'in-progress',
  Paused: 'paused',
  Archived: 'archived',
};

const BY_LOWERCASE: Record<string, ProjectStage> = Object.fromEntries(
  PROJECT_STAGES.map((s) => [s.toLowerCase(), s]),
);

// Rozpoznaje etap niezależnie od wielkości liter (np. "In Progress" → "In progress").
export function canonicalStage(stage: string | undefined): ProjectStage | undefined {
  if (!stage) return undefined;
  return BY_LOWERCASE[stage.trim().toLowerCase()];
}

export function stageLabel(stage: string | undefined, locale: Locale): string | undefined {
  if (!stage) return undefined;
  const known = canonicalStage(stage);
  return known ? LABELS[known][locale] : stage;
}

export function stageDot(stage: string | undefined): string {
  const known = canonicalStage(stage);
  return known ? DOTS[known] : '○';
}

// Klasa CSS do kolorowania plakietki/wiersza wg etapu; nieznana wartość = neutralna.
export function stageSlug(stage: string | undefined): string {
  const known = canonicalStage(stage);
  return known ? SLUGS[known] : 'unknown';
}
