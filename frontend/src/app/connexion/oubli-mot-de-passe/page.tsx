"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2 } from "lucide-react";
import { getSectorMeta } from "@/lib/sector-meta";

export default function ForgotPasswordPage() {
  const meta = getSectorMeta("cipia");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
    } catch {
      // anti-énumération : on affiche le succès quoi qu'il arrive
    }
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: `linear-gradient(180deg, ${meta.surface} 0%, white 100%)`,
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: meta.primary }}
            >
              C
            </div>
            <span className="font-bold text-xl text-gray-900">Cipia OF</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          {submitted ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: meta.primary }}
              >
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Vérifiez votre boîte mail
              </h1>
              <p className="text-sm text-gray-600 mb-6">
                Si un compte existe avec cet email, vous recevrez un lien
                d&apos;activation dans les prochaines minutes. Le lien est valable 72h.
              </p>
              <Link
                href="/connexion"
                className="inline-block py-3 px-6 rounded-lg text-white font-semibold"
                style={{ backgroundColor: meta.primary }}
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: meta.surface, color: meta.primary }}
              >
                <Mail className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
                Recevoir un lien d&apos;activation
              </h1>
              <p className="text-sm text-gray-600 text-center mb-6">
                Entrez votre email — celui utilisé lors de votre paiement Founder
                ou de votre inscription. Vous recevrez un lien magique pour définir
                votre mot de passe.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-lg text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: meta.primary }}
                >
                  {submitting ? "Envoi…" : "Envoyer le lien"}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-gray-500">
                <Link
                  href="/connexion"
                  className="font-medium hover:underline"
                  style={{ color: meta.primaryDark }}
                >
                  Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
