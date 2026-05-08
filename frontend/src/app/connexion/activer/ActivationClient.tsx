"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { getSectorMeta } from "@/lib/sector-meta";

function ActivationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const meta = getSectorMeta("cipia");

  const [tokenStatus, setTokenStatus] = useState<
    | { state: "checking" }
    | { state: "valid" }
    | { state: "invalid"; reason: string }
  >({ state: "checking" });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenStatus({ state: "invalid", reason: "Lien d'activation manquant" });
      return;
    }
    fetch(`/api/auth/set-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setTokenStatus({ state: "valid" });
        else setTokenStatus({ state: "invalid", reason: d.reason || "Lien invalide" });
      })
      .catch(() => setTokenStatus({ state: "invalid", reason: "Erreur réseau" }));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Mot de passe trop court (8 caractères minimum).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'activation.");
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Impossible de contacter le serveur.");
      setSubmitting(false);
    }
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
          {tokenStatus.state === "checking" && (
            <p className="text-center text-gray-500">Vérification du lien…</p>
          )}

          {tokenStatus.state === "invalid" && (
            <div>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
                Lien invalide
              </h1>
              <p className="text-sm text-gray-600 text-center mb-6">
                {tokenStatus.reason}
              </p>
              <Link
                href="/connexion/oubli-mot-de-passe"
                className="block w-full text-center py-3 rounded-lg text-white font-semibold"
                style={{ backgroundColor: meta.primary }}
              >
                Demander un nouveau lien
              </Link>
              <p className="mt-4 text-center text-sm text-gray-500">
                Besoin d&apos;aide ?{" "}
                <a
                  href="mailto:contact@cipia.fr"
                  className="font-medium hover:underline"
                  style={{ color: meta.primaryDark }}
                >
                  contact@cipia.fr
                </a>
              </p>
            </div>
          )}

          {tokenStatus.state === "valid" && (
            <div>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: meta.primary }}
              >
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
                Activez votre compte Founder
              </h1>
              <p className="text-sm text-gray-600 text-center mb-6">
                Choisissez votre mot de passe pour accéder à votre tableau de bord Cipia.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe (8 caractères minimum)
                  </label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer
                  </label>
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-lg text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: meta.primary }}
                >
                  {submitting ? "Activation…" : "Activer mon compte"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ActivationClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Chargement…</p>
        </div>
      }
    >
      <ActivationForm />
    </Suspense>
  );
}
