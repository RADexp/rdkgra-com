// Wykrywanie linków YouTube w treści i ekstrakcja ID wideo.
// Obsługiwane formaty: youtu.be/{id}, youtube.com/watch?v={id}, /embed/{id}, /shorts/{id}.
const YT_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{6,})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?[^"\s]*v=([a-zA-Z0-9_-]{6,})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
];

export function extractYoutubeId(text: string): string | null {
  for (const re of YT_PATTERNS) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

export function isYoutubeOnly(text: string): boolean {
  return extractYoutubeId(text.trim()) !== null && text.trim().length < 200;
}
