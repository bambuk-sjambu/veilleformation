"use client";

import { useState } from "react";

interface Config {
  // PostgreSQL
  db_host: string;
  db_port: string;
  db_name: string;
  db_user: string;
  db_password: string;
  // Google Sheets
  spreadsheet_id: string;
  sheet_name: string;
  // n8n
  n8n_webhook_url: string;
  n8n_delay_ms: string;
  n8n_timeout_ms: string;
  // OpenAI
  openai_api_key: string;
  // Site
  site_url: string;
  theme: string;
  publisher_logo_url: string;
  // Pipeline
  max_subjects_per_day: string;
}

const DEFAULT: Config = {
  db_host: "localhost",
  db_port: "5432",
  db_name: "contentvibe",
  db_user: "contentvibe",
  db_password: "",
  spreadsheet_id: "",
  sheet_name: "cipia",
  n8n_webhook_url: "",
  n8n_delay_ms: "60000",
  n8n_timeout_ms: "7200000",
  openai_api_key: "",
  site_url: "",
  theme: "",
  publisher_logo_url: "",
  max_subjects_per_day: "8",
};

type TestStatus = "idle" | "testing" | "ok" | "error";

interface TestResult {
  db: TestStatus;
  sheets: TestStatus;
  n8n: TestStatus;
  openai: TestStatus;
  dbMsg?: string;
  sheetsMsg?: string;
  n8nMsg?: string;
  openaiMsg?: string;
}

function StatusBadge({ status, msg }: { status: TestStatus; msg?: string }) {
  if (status === "idle") return <span className="text-xs text-gray-400">—</span>;
  if (status === "testing") return <span className="text-xs text-blue-500 animate-pulse">Test...</span>;
  if (status === "ok") return <span className="text-xs text-green-600 font-medium">✓ {msg || "OK"}</span>;
  return <span className="text-xs text-red-500 font-medium">✗ {msg || "Erreur"}</span>;
}

function Field({
  label, name, value, onChange, type = "text", placeholder, hint, mono = false,
}: {
  label: string; name: keyof Config; value: string;
  onChange: (k: keyof Config, v: string) => void;
  type?: string; placeholder?: string; hint?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${mono ? "font-mono" : ""}`}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function PipelineConfigPage() {
  const [config, setConfig] = useState<Config>(DEFAULT);
  const [tests, setTests] = useState<TestResult>({
    db: "idle", sheets: "idle", n8n: "idle", openai: "idle",
  });
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "env">("form");

  const set = (key: keyof Config, value: string) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const databaseUrl = `postgresql://${config.db_user}:${config.db_password}@${config.db_host}:${config.db_port}/${config.db_name}`;

  const envContent = `# ═══════════════════════════════════════════════
# ContentVibe Pipeline — Configuration
# Généré le ${new Date().toLocaleDateString("fr-FR")}
# ═══════════════════════════════════════════════

# PostgreSQL (Hetzner)
DATABASE_URL=${databaseUrl}

# Google Sheets (buffer n8n)
GOOGLE_SHEETS_CREDENTIALS=./credentials.json
SPREADSHEET_ID=${config.spreadsheet_id}
SHEET_NAME=${config.sheet_name}

# n8n
N8N_WEBHOOK_URL=${config.n8n_webhook_url}
N8N_DELAY_MS=${config.n8n_delay_ms}
N8N_TIMEOUT_MS=${config.n8n_timeout_ms}

# OpenAI
OPENAI_API_KEY=${config.openai_api_key}

# Site
SITE_URL=${config.site_url}
THEME=${config.theme}
PUBLISHER_LOGO_URL=${config.publisher_logo_url}

# Pipeline
MAX_SUBJECTS_PER_DAY=${config.max_subjects_per_day}
`;

  const copyEnv = () => {
    navigator.clipboard.writeText(envContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadEnv = () => {
    const blob = new Blob([envContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runTests = async () => {
    setTests({ db: "testing", sheets: "testing", n8n: "testing", openai: "testing" });

    // Test PostgreSQL via API
    try {
      const res = await fetch("/api/pipeline/test-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database_url: databaseUrl }),
      });
      const data = await res.json();
      setTests(prev => ({ ...prev, db: data.ok ? "ok" : "error", dbMsg: data.message }));
    } catch {
      setTests(prev => ({ ...prev, db: "error", dbMsg: "API inaccessible" }));
    }

    // Test Google Sheets via API
    try {
      const res = await fetch("/api/pipeline/test-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheet_id: config.spreadsheet_id, sheet_name: config.sheet_name }),
      });
      const data = await res.json();
      setTests(prev => ({ ...prev, sheets: data.ok ? "ok" : "error", sheetsMsg: data.message }));
    } catch {
      setTests(prev => ({ ...prev, sheets: "error", sheetsMsg: "API inaccessible" }));
    }

    // Test n8n via API
    try {
      const res = await fetch("/api/pipeline/test-n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: config.n8n_webhook_url }),
      });
      const data = await res.json();
      setTests(prev => ({ ...prev, n8n: data.ok ? "ok" : "error", n8nMsg: data.message }));
    } catch {
      setTests(prev => ({ ...prev, n8n: "error", n8nMsg: "API inaccessible" }));
    }

    // Test OpenAI via API
    try {
      const res = await fetch("/api/pipeline/test-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: config.openai_api_key }),
      });
      const data = await res.json();
      setTests(prev => ({ ...prev, openai: data.ok ? "ok" : "error", openaiMsg: data.message }));
    } catch {
      setTests(prev => ({ ...prev, openai: "error", openaiMsg: "API inaccessible" }));
    }
  };

  const isComplete = config.spreadsheet_id && config.n8n_webhook_url &&
    config.openai_api_key && config.site_url && config.db_password;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuration Pipeline ContentVibe</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Renseigne les paramètres du pipeline n8n → PostgreSQL → Next.js
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab("form")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${activeTab === "form" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Formulaire
        </button>
        <button
          onClick={() => setActiveTab("env")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${activeTab === "env" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          .env généré
        </button>
      </div>

      {activeTab === "form" && (
        <div className="space-y-6">

          {/* PostgreSQL */}
          <section className="bg-white border rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded text-xs flex items-center justify-center font-bold">DB</span>
              PostgreSQL (Hetzner)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hôte" name="db_host" value={config.db_host} onChange={set} placeholder="localhost" />
              <Field label="Port" name="db_port" value={config.db_port} onChange={set} placeholder="5432" />
              <Field label="Nom de la base" name="db_name" value={config.db_name} onChange={set} placeholder="contentvibe" />
              <Field label="Utilisateur" name="db_user" value={config.db_user} onChange={set} placeholder="contentvibe" />
            </div>
            <div className="mt-4">
              <Field label="Mot de passe" name="db_password" value={config.db_password} onChange={set} type="password" placeholder="••••••••" />
            </div>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-mono break-all">{databaseUrl}</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Commande Hetzner :{" "}
                <code className="bg-gray-100 px-1 rounded">
                  sudo -u postgres createuser -P contentvibe && createdb -O contentvibe contentvibe
                </code>
              </p>
              <StatusBadge status={tests.db} msg={tests.dbMsg} />
            </div>
          </section>

          {/* Google Sheets */}
          <section className="bg-white border rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-100 text-green-700 rounded text-xs flex items-center justify-center font-bold">GS</span>
              Google Sheets (buffer n8n)
            </h2>
            <div className="space-y-4">
              <Field
                label="Spreadsheet ID"
                name="spreadsheet_id"
                value={config.spreadsheet_id}
                onChange={set}
                placeholder="18A1IaWjX2n6ipHcv4sBlNNDq..."
                hint="L'ID se trouve dans l'URL : docs.google.com/spreadsheets/d/[ID]/edit"
                mono
              />
              <Field
                label="Nom de l'onglet"
                name="sheet_name"
                value={config.sheet_name}
                onChange={set}
                placeholder="cipia"
                hint="Nom exact de l'onglet utilisé par n8n (sensible à la casse)"
              />
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <strong>credentials.json</strong> — Copier le fichier Service Account Google dans le dossier du pipeline.
                Partager la Sheets avec : <code>contentvibe@boxwood-victor-383809.iam.gserviceaccount.com</code>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <StatusBadge status={tests.sheets} msg={tests.sheetsMsg} />
            </div>
          </section>

          {/* n8n */}
          <section className="bg-white border rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-700 rounded text-xs flex items-center justify-center font-bold">n8</span>
              n8n
            </h2>
            <div className="space-y-4">
              <Field
                label="URL Webhook"
                name="n8n_webhook_url"
                value={config.n8n_webhook_url}
                onChange={set}
                placeholder="https://n8n.domain.fr/webhook/xxx"
                mono
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Délai entre appels (ms)"
                  name="n8n_delay_ms"
                  value={config.n8n_delay_ms}
                  onChange={set}
                  hint="60000 = 1 minute"
                />
                <Field
                  label="Timeout (ms)"
                  name="n8n_timeout_ms"
                  value={config.n8n_timeout_ms}
                  onChange={set}
                  hint="7200000 = 2 heures"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <StatusBadge status={tests.n8n} msg={tests.n8nMsg} />
            </div>
          </section>

          {/* OpenAI */}
          <section className="bg-white border rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded text-xs flex items-center justify-center font-bold">AI</span>
              OpenAI
            </h2>
            <Field
              label="API Key"
              name="openai_api_key"
              value={config.openai_api_key}
              onChange={set}
              type="password"
              placeholder="sk-..."
              mono
            />
            <div className="mt-3 flex justify-end">
              <StatusBadge status={tests.openai} msg={tests.openaiMsg} />
            </div>
          </section>

          {/* Site */}
          <section className="bg-white border rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded text-xs flex items-center justify-center font-bold">🌐</span>
              Site & Contenu
            </h2>
            <div className="space-y-4">
              <Field label="URL du site" name="site_url" value={config.site_url} onChange={set} placeholder="https://monsite.fr" />
              <Field
                label="Logo URL (200×60px min)"
                name="publisher_logo_url"
                value={config.publisher_logo_url}
                onChange={set}
                placeholder="https://monsite.fr/logo.png"
                hint="Requis pour le schema Article Google — format PNG recommandé"
              />
              <Field
                label="Thème éditorial"
                name="theme"
                value={config.theme}
                onChange={set}
                placeholder="veille réglementaire formation professionnelle Qualiopi"
                hint="Utilisé par OpenAI pour générer des sujets pertinents"
              />
              <Field
                label="Articles générés par semaine"
                name="max_subjects_per_day"
                value={config.max_subjects_per_day}
                onChange={set}
                hint="Recommandé : 8 (1 cycle hebdomadaire complet)"
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={runTests}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Tester les connexions
            </button>
            <button
              onClick={() => setActiveTab("env")}
              disabled={!isComplete}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition ${isComplete ? "bg-yellow-400 text-black hover:bg-yellow-300" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              Générer le .env →
            </button>
          </div>
          {!isComplete && (
            <p className="text-xs text-amber-600 text-center">
              Champs manquants : {[
                !config.db_password && "mot de passe DB",
                !config.spreadsheet_id && "Spreadsheet ID",
                !config.n8n_webhook_url && "URL n8n",
                !config.openai_api_key && "clé OpenAI",
                !config.site_url && "URL du site",
              ].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      )}

      {activeTab === "env" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 relative">
            <pre className="text-green-400 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {envContent}
            </pre>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyEnv}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              {copied ? "✓ Copié !" : "Copier"}
            </button>
            <button
              onClick={downloadEnv}
              className="flex-1 bg-yellow-400 text-black px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-yellow-300 transition"
            >
              Télécharger .env
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">Étapes suivantes sur Hetzner :</p>
            <ol className="space-y-1 list-decimal list-inside text-xs">
              <li>Copier <code className="bg-blue-100 px-1 rounded">.env</code> dans <code className="bg-blue-100 px-1 rounded">/app/blog-automation-pipeline-BDD/</code></li>
              <li>Copier <code className="bg-blue-100 px-1 rounded">credentials.json</code> dans le même dossier</li>
              <li>Lancer <code className="bg-blue-100 px-1 rounded">npm install && npm run setup-db</code></li>
              <li>Tester avec <code className="bg-blue-100 px-1 rounded">npm run subjects</code></li>
              <li>Configurer le cron PM2 pour le cycle hebdomadaire</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
