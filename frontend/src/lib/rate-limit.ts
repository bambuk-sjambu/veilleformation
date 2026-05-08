/**
 * Rate limit en mémoire (token bucket simple).
 *
 * Process-local : OK pour 1 instance Vercel/pm2. Si scale horizontal, migrer
 * vers Vercel KV / Redis. Pour démarrer (lancement Founder Phase 1), suffit.
 *
 * Politique recommandée :
 * - /api/founders/checkout : 5 req/min/IP (anti-DoS Stripe)
 * - /api/auth/login        : 5 req/min/IP (anti-bruteforce)
 * - /api/auth/register     : 3 req/min/IP (anti-spam comptes)
 * - /api/auth/forgot-password : 3 req/min/IP (anti-enum email)
 * - /api/subscribe         : 10 req/min/IP (newsletter)
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// GC simple : supprime les buckets expirés toutes les 5 min
let lastGc = Date.now();
const GC_INTERVAL_MS = 5 * 60 * 1000;

function gc(now: number) {
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/**
 * Vérifie si une requête est sous la limite. Incrémente le compteur si OK.
 *
 * @param key - identifiant unique (typiquement `${endpoint}:${ip}` ou `:${userId}`)
 * @param maxReqs - nombre max de requêtes dans la fenêtre
 * @param windowMs - fenêtre en millisecondes (ex: 60_000 pour 1 min)
 * @returns true si OK (sous la limite), false si refusé (dépassé)
 */
export function rateLimitOk(
  key: string,
  maxReqs: number,
  windowMs: number
): boolean {
  const now = Date.now();
  gc(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= maxReqs) return false;
  bucket.count++;
  return true;
}

/**
 * Réinitialise le bucket (utile dans les tests ou après login réussi).
 */
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}
