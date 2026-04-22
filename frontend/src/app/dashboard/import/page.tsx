"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  plan: string;
}

interface ExternalContent {
  id: number;
  source_type: string;
  source_url: string | null;
  file_name: string | null;
  title: string;
  summary: string | null;
  qualiopi_indicators: string | null;
  impact_level: string | null;
  relevance_score: number | null;
  processed: number;
  created_at: string;
}

export default function ImportPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [contents, setContents] = useState<ExternalContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [importType, setImportType] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const canImport = user?.plan && user.plan !== "free";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, contentRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/external"),
      ]);

      const userData = await userRes.json();
      const contentData = await contentRes.json();

      setUser(userData.user);
      setContents(contentData.contents || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("source_type", importType);
      formData.append("title", title);

      if (importType === "url") {
        formData.append("url", url);
      } else if (file) {
        formData.append("file", file);
      }

      const res = await fetch("/api/external", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setContents([data.content, ...contents]);
      setUrl("");
      setTitle("");
      setFile(null);
      setMessage({ type: "success", text: "Contenu importe avec succes" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce contenu ?")) return;

    try {
      const res = await fetch(`/api/external/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      setContents(contents.filter(c => c.id !== id));
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la suppression" });
    }
  };

  const getIndicatorLabels = (indicators: string | null) => {
    if (!indicators) return [];
    const labels: Record<string, string> = {
      "23": "Legal",
      "24": "Competences",
      "25": "Pedagogie",
      "26": "Handicap",
    };
    try {
      const parsed = JSON.parse(indicators);
      return parsed.map((i: string) => labels[i] || i);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Importer du contenu</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {message.text}
          </div>
        )}

        {!canImport ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-4 text-lg font-medium">Import de contenu externe</p>
              <p className="mt-2">Passez au plan Solo pour importer vos propres documents et URL.</p>
            </div>
            <Link href="/dashboard/abonnement" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Voir les offres
            </Link>
          </div>
        ) : (
          <>
            {/* Import form */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-medium mb-4">Nouvel import</h2>

              {/* Type selector */}
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setImportType("url")}
                  className={`flex-1 p-4 border rounded-lg text-center ${
                    importType === "url" ? "border-blue-600 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <p className="mt-2 font-medium">URL</p>
                  <p className="text-sm text-gray-500">Importer depuis un lien</p>
                </button>
                <button
                  onClick={() => setImportType("file")}
                  className={`flex-1 p-4 border rounded-lg text-center ${
                    importType === "file" ? "border-blue-600 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 font-medium">Fichier</p>
                  <p className="text-sm text-gray-500">PDF, Word, TXT</p>
                </button>
              </div>

              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Note de service du 15 mars"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {importType === "url" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fichier *</label>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.txt"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Max {user?.plan === "agence" ? "50 MB" : user?.plan === "équipe" ? "20 MB" : "5 MB"}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? "Import en cours..." : "Importer et analyser"}
                </button>
              </form>
            </div>

            {/* Imported content list */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium">Mes imports ({contents.length})</h2>
              </div>

              {contents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucun contenu importe
                </div>
              ) : (
                <div className="divide-y">
                  {contents.map((content) => (
                    <div key={content.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {content.source_type === "url" ? "URL" : "Fichier"}
                            </span>
                            {content.processed ? (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                Analyse
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                En cours
                              </span>
                            )}
                            {content.impact_level && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                content.impact_level === "fort" ? "bg-red-100 text-red-800" :
                                content.impact_level === "moyen" ? "bg-yellow-100 text-yellow-800" :
                                "bg-green-100 text-green-800"
                              }`}>
                                Impact {content.impact_level}
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium mt-2">{content.title}</h3>
                          {content.source_url && (
                            <a
                              href={content.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline truncate block"
                            >
                              {content.source_url}
                            </a>
                          )}
                          {content.file_name && (
                            <p className="text-sm text-gray-500">{content.file_name}</p>
                          )}
                          {content.summary && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{content.summary}</p>
                          )}
                          {content.qualiopi_indicators && getIndicatorLabels(content.qualiopi_indicators).length > 0 && (
                            <div className="flex space-x-2 mt-2">
                              {getIndicatorLabels(content.qualiopi_indicators).map((label: string) => (
                                <span key={label} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                  Ind. {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="text-red-500 hover:text-red-700 ml-4"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
