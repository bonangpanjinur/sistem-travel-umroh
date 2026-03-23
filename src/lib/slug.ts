/**
 * Converts a string into a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')   // Remove all non-word chars
    .replace(/--+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')        // Trim - from start of text
    .replace(/-+$/, '');       // Trim - from end of text
}

/**
 * Extracts the ID from an id-slug string (e.g., "123-my-package" -> "123")
 */
export function extractIdFromSlug(idSlug: string): string {
  if (!idSlug) return '';
  const parts = idSlug.split('-');
  return parts[0];
}
