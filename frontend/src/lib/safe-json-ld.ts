/**
 * Sérialise un schéma JSON-LD pour `dangerouslySetInnerHTML` en échappant
 * la séquence `</` qui peut casser le parser HTML et permettre une injection
 * `</script><script>...` via une string contrôlée par un user (titre blog,
 * commentaire, etc.).
 *
 * Référence : OWASP DOM XSS prevention.
 */
export function safeJsonLd(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
