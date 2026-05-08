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

/**
 * Récupère l'IP client réelle. Priorise `x-real-ip` (header set par le
 * reverse proxy de confiance — nginx/Caddy/Hetzner Load Balancer) sur
 * `x-forwarded-for[0]` qui peut être spoofé librement par n'importe quel
 * client (le reverse proxy concatène derrière mais l'attaquant peut envoyer
 * `X-Forwarded-For: 1.2.3.4` arbitraire — la 1re entrée est sa valeur).
 *
 * Si pas de proxy en amont, fallback sur la dernière entrée du XFF (= la
 * première après le client, donc la plus proche du serveur, moins
 * spoofable). Sinon "unknown" → tous les requests partagent le même bucket.
 */
export function getClientIp(headers: {
  get(name: string): string | null;
}): string {
  // 1. x-real-ip est set par le reverse proxy directement, jamais par le client
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  // 2. fallback sur le dernier hop de x-forwarded-for (le proxy ajoute en queue)
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      // Prendre la dernière IP (la plus proche du serveur, moins spoofable que la 1re)
      return parts[parts.length - 1];
    }
  }

  return "unknown";
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
