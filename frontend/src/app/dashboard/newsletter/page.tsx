"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Eye,
  MousePointerClick,
  Users,
  Loader2,
  ExternalLink,
  CalendarClock,
  X,
} from "lucide-react";

interface Newsletter {
  id: number;
  edition_number: number;
  subject: string;
  sent_at: string | null;
  recipients_count: number;
  open_rate: number | null;
  click_rate: number | null;
  unsubscribe_count: number;
}

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function getNextTuesday(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntil = day <= 2 ? 2 - day : 9 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + (daysUntil === 0 ? 7 : daysUntil));
  const dd = String(next.getDate()).padStart(2, "0");
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const yyyy = next.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function NewsletterPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetch("/api/newsletters")
      .then((res) => res.json())
      .then((data) => setNewsletters(data.newsletters || []))
      .catch(() => setNewsletters([]))
      .finally(() => setLoading(false));
  }, []);

  function openPreview(id: number, subject: string) {
    setLoadingPreview(true);
    setPreviewSubject(subject);
    fetch(`/api/newsletters?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.newsletter?.html_content) {
          setPreviewHtml(data.newsletter.html_content);
        } else {
          setPreviewHtml(
            "<p style='padding:40px;text-align:center;color:#666;'>Aucun contenu HTML disponible.</p>"
          );
        }
      })
      .catch(() =>
        setPreviewHtml(
          "<p style='padding:40px;text-align:center;color:#666;'>Erreur de chargement.</p>"
        )
      )
      .finally(() => setLoadingPreview(false));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Newsletters</h1>
        <p className="text-gray-600 mt-1">
          Historique et statistiques de vos newsletters
        </p>
      </div>

      {/* Next newsletter info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <CalendarClock className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Prochaine newsletter :</span> Mardi{" "}
          {getNextTuesday()} a 8h00
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : newsletters.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune newsletter envoyee
          </h2>
          <p className="text-gray-500">
            La premiere newsletter sera envoyee mardi prochain a 8h.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {newsletters.map((nl) => (
            <div
              key={nl.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      #{nl.edition_number}
                    </span>
                    {nl.sent_at && (
                      <span className="text-xs text-gray-400">
                        {formatDateFr(nl.sent_at)}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3">
                    {nl.subject}
                  </h3>

                  <div className="flex items-center flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      {nl.recipients_count} destinataire
                      {nl.recipients_count !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Eye className="w-3.5 h-3.5" />
                      Ouverture : {formatPercent(nl.open_rate)}
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <MousePointerClick className="w-3.5 h-3.5" />
                      Clics : {formatPercent(nl.click_rate)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openPreview(nl.id, nl.subject)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Apercu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {(previewHtml || loadingPreview) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 truncate">
                {previewSubject}
              </h3>
              <button
                onClick={() => {
                  setPreviewHtml(null);
                  setPreviewSubject("");
                }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml || ""}
                  className="w-full h-full min-h-[60vh] border-0"
                  title="Apercu newsletter"
                  sandbox="allow-same-origin"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
