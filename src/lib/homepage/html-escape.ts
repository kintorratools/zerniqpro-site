/**
 * Escape a CMS text value for safe insertion into HTML via set:html.
 * Converts < > & " ' to their HTML entity equivalents.
 * Returns empty string for null/undefined/empty inputs.
 */
export function escapeCmsText(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Check if a CMS text value contains dangerous HTML tags or scripts.
 * Used in Zod schema validation to reject CMS responses with injected HTML.
 */
export function hasDangerousHtml(value: string | null | undefined): boolean {
  if (value == null || value === '') return false;
  return (
    /<script[\s>]/i.test(value) ||
    /<style[\s>]/i.test(value) ||
    /<\/?(script|style|iframe|object|embed|link|meta)/i.test(value)
  );
}
