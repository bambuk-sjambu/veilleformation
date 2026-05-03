"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const SECTORS: { value: string; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "boulangerie-patisserie", label: "Boulangerie / Pâtisserie" },
  { value: "traiteur", label: "Traiteur" },
  { value: "industrie-agro", label: "Industrie agroalimentaire" },
  { value: "autre", label: "Autre" },
];

export default function HaccpSignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Adresse email invalide");
      return;
    }
    if (!sector) {
      setError("Sélectionnez votre secteur");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/beta/haccp/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sector, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue");
        setLoading(false);
        return;
      }
      router.push("/beta/haccp/merci");
    } catch {
      setError("Impossible de contacter le serveur");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
      <input
        type="email"
        placeholder="votre@email.fr"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      <select
        required
        value={sector}
        onChange={(e) => setSector(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="">Votre secteur…</option>
        {SECTORS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center px-6 py-3 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          "Recevoir mon accès beta gratuit"
        )}
      </button>
      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}
      <p className="text-xs text-gray-500 text-center pt-1">
        Vos données ne sont utilisées que pour cette beta. Pas de spam, pas de
        revente. RGPD : désinscription en un clic.
      </p>
    </form>
  );
}
