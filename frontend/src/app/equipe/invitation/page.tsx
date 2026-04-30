"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { sector } from "@/config";

type InvitationDetails = {
  email: string;
  role: string;
  teamName: string;
  inviterName: string | null;
  expiresAt: string;
};

export default function InvitationAcceptPage() {
  return (
    <Suspense fallback={null}>
      <InvitationAcceptInner />
    </Suspense>
  );
}

function InvitationAcceptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Lien d'invitation invalide.");
      setLoading(false);
      return;
    }

    fetch(`/api/teams/invitations/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invitation introuvable.");
        } else {
          setInvitation(data.invitation);
        }
      })
      .catch(() => setError("Impossible de récupérer l'invitation."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);

    const res = await fetch(`/api/teams/invitations/${token}/accept`, { method: "POST" });
    const data = await res.json();

    if (res.status === 401) {
      setNeedsLogin(true);
      setAccepting(false);
      return;
    }

    if (!res.ok) {
      setError(data.error || "L'acceptation a échoué.");
      setAccepting(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">{sector.brand.name.charAt(0)}</span>
          </div>
          <span className="text-xl font-bold text-gray-900">{sector.brand.name}</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-8 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p>Vérification de l&apos;invitation...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Invitation invalide</h1>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : success ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              Bienvenue dans l&apos;équipe !
            </h1>
            <p className="text-sm text-gray-600">Redirection vers votre tableau de bord...</p>
          </div>
        ) : needsLogin ? (
          <div className="py-4">
            <Users className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-lg font-semibold text-gray-900 mb-2 text-center">
              Connexion requise
            </h1>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Pour rejoindre l&apos;équipe <strong>{invitation?.teamName}</strong>, connectez-vous
              avec l&apos;adresse <strong>{invitation?.email}</strong>.
            </p>
            <div className="space-y-2">
              <Link
                href={`/connexion?next=${encodeURIComponent(`/equipe/invitation?token=${token}`)}`}
                className="block w-full text-center px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark"
              >
                Se connecter
              </Link>
              <Link
                href={`/inscription?email=${encodeURIComponent(invitation?.email || "")}&next=${encodeURIComponent(`/equipe/invitation?token=${token}`)}`}
                className="block w-full text-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        ) : invitation ? (
          <div>
            <Users className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">
              Invitation à rejoindre une équipe
            </h1>
            <p className="text-sm text-gray-600 mb-6 text-center">
              {invitation.inviterName ? (
                <>
                  <strong>{invitation.inviterName}</strong> vous invite à rejoindre l&apos;équipe{" "}
                  <strong>{invitation.teamName}</strong> sur {sector.brand.name} en tant que{" "}
                  <strong>{invitation.role === "admin" ? "administrateur" : "membre"}</strong>.
                </>
              ) : (
                <>
                  Vous êtes invité à rejoindre l&apos;équipe{" "}
                  <strong>{invitation.teamName}</strong> sur {sector.brand.name}.
                </>
              )}
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Email invité</span>
                <span className="font-medium text-gray-900">{invitation.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rôle</span>
                <span className="font-medium text-gray-900">
                  {invitation.role === "admin" ? "Administrateur" : "Membre"}
                </span>
              </div>
            </div>

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Acceptation...
                </>
              ) : (
                "Rejoindre l'équipe"
              )}
            </button>

            <Link
              href="/"
              className="block mt-3 text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Décliner et retourner à l&apos;accueil
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
