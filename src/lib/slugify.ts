// Slugify 1:1 z logiką poprzedniego projektu: NFD normalize, usunięcie
// diakrytyków, lowercase, niealfanumeryczne -> myślnik, redukcja wielokrotnych
// myślników, trim krawędzi.
// "ł/Ł" nie mają dekompozycji NFD (to odrębne litery, nie litera + znak
// diakrytyczny), więc trzeba je zamienić na "l" ręcznie przed resztą pipeline'u.
//
// UWAGA (różnica względem poprzedniego projektu): tutaj slug liczony jest
// PER JĘZYK, z tytułu w danym języku — PL i EN mogą mieć różne slugi tego
// samego artykułu.
export function slugify(input: string): string {
  return input
    .replace(/[łŁ]/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
