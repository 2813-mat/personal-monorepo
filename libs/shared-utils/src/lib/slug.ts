/**
 * Converte um rótulo legível no slug usado como id de categoria:
 * minúsculas, sem acentos, não-alfanuméricos viram um único hífen.
 */
export function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
