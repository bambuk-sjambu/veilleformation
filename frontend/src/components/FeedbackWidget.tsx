"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  X,
  Star,
  Bug,
  HelpCircle,
  Lightbulb,
  AlertCircle,
  Upload,
  Loader2,
  CheckCircle,
} from "lucide-react";

type Category = "bug" | "manque" | "suggestion" | "confus";

const CATEGORIES: Array<{
  value: Category;
  label: string;
  icon: typeof Bug;
}> = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "manque", label: "Il manque qqch", icon: AlertCircle },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb },
  { value: "confus", label: "C'est confus", icon: HelpCircle },
];

const MIN_TEXT = 10;
const MAX_TEXT = 1000;

export default function FeedbackWidget({
  isFeedbackPanel,
}: {
  isFeedbackPanel: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Auto-fermeture du toast success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  if (!isFeedbackPanel) return null;

  function resetForm() {
    setCategory(null);
    setRating(0);
    setHoverRating(0);
    setText("");
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      setError("Seules les images sont acceptees");
      e.target.value = "";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Image trop volumineuse (max 5 Mo)");
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    setError(null);

    if (!category) {
      setError("Choisis une categorie");
      return;
    }
    if (text.trim().length < MIN_TEXT) {
      setError(`Le message doit faire au moins ${MIN_TEXT} caracteres`);
      return;
    }
    if (text.length > MAX_TEXT) {
      setError(`Le message ne doit pas depasser ${MAX_TEXT} caracteres`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload screenshot si fourni
      let screenshotUrl: string | null = null;
      if (file) {
        const fd = new FormData();
        fd.append("screenshot", file);
        const upRes = await fetch("/api/feedback/upload", {
          method: "POST",
          body: fd,
        });
        if (!upRes.ok) {
          const j = (await upRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(j.error || "Erreur upload screenshot");
        }
        const upJson = (await upRes.json()) as { url: string };
        screenshotUrl = upJson.url;
      }

      // 2. POST feedback
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          page: pathname || "/",
          rating: rating > 0 ? rating : null,
          text: text.trim(),
          screenshot_url: screenshotUrl,
        }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Erreur ${res.status}`);
      }

      // Success
      setSuccess(true);
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  const charCount = text.length;
  const charColor =
    charCount > MAX_TEXT
      ? "text-red-600"
      : charCount < MIN_TEXT
      ? "text-gray-400"
      : "text-green-600";

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-blue-700 hover:bg-blue-800 text-white rounded-full shadow-lg p-4 transition flex items-center gap-2 group"
          aria-label="Donner un feedback"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden group-hover:inline text-sm font-medium pr-1">
            Feedback
          </span>
        </button>
      )}

      {/* Toast success */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Merci, retour envoye !</span>
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-700" />
                <h2 className="font-semibold text-gray-900">
                  Donner un feedback
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Page concernee */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Page concernee
                </label>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 font-mono break-all">
                  {pathname || "/"}
                </div>
              </div>

              {/* Categorie */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Categorie
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = category === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                          active
                            ? "border-blue-700 bg-blue-50 text-blue-800"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Note (optionnelle)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (hoverRating || rating) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(rating === n ? 0 : n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1"
                        aria-label={`${n} etoiles`}
                      >
                        <Star
                          className={`w-6 h-6 transition ${
                            active
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                  {rating > 0 && (
                    <button
                      type="button"
                      onClick={() => setRating(0)}
                      className="ml-2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      effacer
                    </button>
                  )}
                </div>
              </div>

              {/* Texte */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Ton retour
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  maxLength={MAX_TEXT + 50}
                  placeholder="Decris ce qui se passe, ce que tu attendais, ou ce qui te bloque..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-700 focus:border-blue-700 outline-none resize-none"
                />
                <div
                  className={`text-xs mt-1 text-right ${charColor}`}
                  aria-live="polite"
                >
                  {charCount} / {MAX_TEXT} caracteres
                  {charCount < MIN_TEXT && ` (min ${MIN_TEXT})`}
                </div>
              </div>

              {/* Screenshot */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Capture d&apos;ecran (optionnel, max 5 Mo)
                </label>
                {!previewUrl ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-700 hover:text-blue-700 transition"
                  >
                    <Upload className="w-4 h-4" />
                    Choisir une image
                  </button>
                ) : (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="max-h-32 rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="absolute -top-2 -right-2 bg-white rounded-full shadow border border-gray-200 p-1 text-gray-500 hover:text-red-600"
                      aria-label="Retirer l'image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Erreur */}
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
