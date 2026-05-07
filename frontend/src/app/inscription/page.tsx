"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { ALL_SECTOR_IDS, getSectorMeta } from "@/lib/sector-meta";

function InscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pré-rempli depuis ?secteur=X (lien depuis page sectorielle)
  const initialSector = (() => {
    const s = searchParams.get("secteur");
    return s && ALL_SECTOR_IDS.includes(s) ? s : "cipia";
  })();

  const [sectorId, setSectorId] = useState<string>(initialSector);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const meta = getSectorMeta(sectorId);

  // Branding dynamique selon le secteur sélectionné
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", meta.primary);
    root.style.setProperty("--color-primary-dark", meta.primaryDark);
    root.style.setProperty("--color-accent", meta.accent);
    return () => {
      // Reset quand on quitte la page
      root.style.removeProperty("--color-primary");
      root.style.removeProperty("--color-primary-dark");
      root.style.removeProperty("--color-accent");
    };
  }, [meta.primary, meta.primaryDark, meta.accent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          sectorId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: `linear-gradient(180deg, ${meta.surface} 0%, #F9FAFB 100%)`,
      }}
    >
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: meta.primary }}
            >
              <span className="text-white font-bold">C</span>
            </div>
            <span className="font-bold text-xl text-gray-900">
              {meta.shortLabel}
            </span>
            <span className="text-2xl">{meta.emoji}</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Créer votre compte
          </h1>
          <p className="text-gray-600 mt-1">
            Choisissez votre métier et démarrez en 30 secondes.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* Sélecteur secteur */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Mon métier
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ALL_SECTOR_IDS.map((id) => {
                const m = getSectorMeta(id);
                const active = id === sectorId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSectorId(id)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: active ? m.primary : "#E5E7EB",
                      backgroundColor: active ? m.surface : "white",
                    }}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span
                      className="text-xs font-semibold text-center leading-tight"
                      style={{ color: active ? m.primaryDark : "#374151" }}
                    >
                      {m.shortLabel.replace("Cipia ", "")}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {meta.longLabel}. Vous pourrez ajouter d&apos;autres secteurs avec
              le plan Cabinet (199€/an).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Prénom
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Marie"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nom
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="votre@email.fr"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                  placeholder="8 caractères minimum"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Répétez le mot de passe"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: meta.primary }}
            >
              {loading ? (
                <span>Création du compte...</span>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Créer mon compte {meta.shortLabel}
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="font-medium hover:underline"
            style={{ color: meta.primaryDark }}
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Chargement…</p>
        </div>
      }
    >
      <InscriptionForm />
    </Suspense>
  );
}
