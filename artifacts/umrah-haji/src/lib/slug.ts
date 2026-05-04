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
 * Extracts the ID from an id-slug string.
 * Supports both numeric IDs (e.g., "123-my-package" -> "123")
 * and UUID format (e.g., "09c4f56d-6f6c-4f29-b186-0946c7968f2a-umroh-plus" -> "09c4f56d-6f6c-4f29-b186-0946c7968f2a")
 */
export function extractIdFromSlug(idSlug: string): string {
  if (!idSlug) return '';
  
  // UUID v4 format: 8-4-4-4-12 hexadecimal digits
  // Pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const uuidMatch = idSlug.match(uuidPattern);
  
  if (uuidMatch) {
    return uuidMatch[0];
  }
  
  // Fallback for numeric IDs
  const parts = idSlug.split('-');
  return parts[0];
}
