"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Tab = "profile" | "password" | "company" | "alerts" | "team" | "préférences";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  phone: string | null;
  plan: string;
  preferred_regions?: string | null;
}

interface Profile {
  company_name: string;
  siret: string | null;
  nde: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  responsible_name: string | null;
  responsible_function: string | null;
  methodology_notes: string | null;
}

interface Alert {
  id: number;
  name: string;
  keywords: string;
  regions: string | null;
  indicators: string | null;
  categories: string | null;
  frequency: string;
  active: number;
  created_at: string;
}

interface Team {
  id: number;
  name: string;
  user_role: string;
  member_count: number;
}

interface TeamMember {
  id: number;
  user_id: number;
  role: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Invitation {
  id: number;
  email: string;
  role: string;
  expires_at: string;
}

export default function ParamètresPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [user, setUser] = useState<Partial<User>>({});
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: "",
    keywords: "",
    regions: "",
    indicators: [] as string[],
    frequency: "instant",
  });

  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Préférences state
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);

  const canUseAlerts = user.plan && user.plan !== "free";
  const canUseTeams = user.plan && (user.plan === "équipe" || user.plan === "agence");

  useEffect(() => {
    fetchData();
  }, []);

  // Lire le paramètre tab de l'URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["profile", "password", "company", "alerts", "team", "préférences"].includes(tab)) {
      setActiveTab(tab as Tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user.plan) {
      fetchAlerts();
      if (user.plan === "équipe" || user.plan === "agence") {
        fetchTeams();
      }
    }
  }, [user.plan]);

  const fetchData = async () => {
    try {
      const [userRes, profileRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/profile"),
      ]);

      const userData = await userRes.json();
      const profileData = await profileRes.json();

      setUser(userData.user || {});
      setProfile(profileData.profile || {});

      // Load preferred regions
      if (userData.user?.preferred_regions) {
        try {
          const regions = JSON.parse(userData.user.preferred_regions);
          setPreferredRegions(Array.isArray(regions) ? regions : []);
        } catch {
          setPreferredRegions([]);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchTeamDetails = async (teamId: number) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Error fetching team details:", error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Veuillez sélectionner une image" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "L'image ne doit pas dépasser 2 Mo" });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser({ ...user, avatar_url: data.avatar_url });
      setMessage({ type: "success", text: "Photo de profil mise à jour" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur lors de l'upload" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser(data.user);
      setMessage({ type: "success", text: "Profil mis à jour" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 8 caractères" });
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Mot de passe mis à jour" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProfile(data.profile);
      setMessage({ type: "success", text: "Profil entreprise mis à jour" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const first = user.first_name?.[0] || "";
    const last = user.last_name?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  // Alert handlers
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAlert.name,
          keywords: newAlert.keywords.split(",").map(k => k.trim()).filter(Boolean),
          regions: newAlert.regions ? newAlert.regions.split(",").map(r => r.trim()).filter(Boolean) : null,
          indicators: newAlert.indicators.length > 0 ? newAlert.indicators : null,
          frequency: newAlert.frequency,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAlerts([...alerts, data.alert]);
      setShowAlertForm(false);
      setNewAlert({ name: "", keywords: "", regions: "", indicators: [], frequency: "instant" });
      setMessage({ type: "success", text: "Alerte créée" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlert = async (alertId: number) => {
    if (!confirm("Supprimer cette alerte ?")) return;

    try {
      const res = await fetch(`/api/alerts/${alertId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la suppression" });
    }
  };

  const handleToggleAlert = async (alertId: number, active: boolean) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (!res.ok) throw new Error("Erreur mise à jour");
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, active: active ? 0 : 1 } : a));
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la mise à jour" });
    }
  };

  // Team handlers
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTeams([...teams, data.team]);
      setShowTeamForm(false);
      setNewTeamName("");
      setMessage({ type: "success", text: "Équipe créée" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/teams/${selectedTeam}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchTeamDetails(selectedTeam);
      setShowInviteForm(false);
      setInviteEmail("");
      setInviteRole("member");
      setMessage({ type: "success", text: "Invitation envoyée" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedTeam || !confirm("Retirer ce membre ?")) return;

    try {
      const res = await fetch(`/api/teams/${selectedTeam}/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la suppression" });
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
              <h1 className="text-2xl font-bold text-gray-900">Mon compte</h1>
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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === "profile"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Mon profil
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === "password"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Mot de passe
              </button>
              <button
                onClick={() => setActiveTab("company")}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === "company"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Profil entreprise
              </button>
              <button
                onClick={() => setActiveTab("alerts")}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === "alerts"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Alertes {canUseAlerts && alerts.length > 0 && `(${alerts.length})`}
              </button>
              <button
                onClick={() => setActiveTab("team")}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === "team"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Mon équipe
              </button>
              <button
                onClick={() => setActiveTab("préférences")}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === "préférences"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Préférences AO
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <form onSubmit={handleUserUpdate} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center space-x-6">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {getInitials()}
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Photo de profil</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="mt-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploadingAvatar ? "Envoi..." : "Changer la photo"}
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={user.first_name || ""}
                    onChange={(e) => setUser({ ...user, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={user.last_name || ""}
                    onChange={(e) => setUser({ ...user, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <input
                  type="tel"
                  value={user.phone || ""}
                  onChange={(e) => setUser({ ...user, phone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  minLength={8}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Minimum 8 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  minLength={8}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Changement..." : "Changer le mot de passe"}
              </button>
            </form>
          )}

          {/* Company Tab */}
          {activeTab === "company" && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l entreprise *
                  </label>
                  <input
                    type="text"
                    value={profile.company_name || ""}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                  <input
                    type="text"
                    value={profile.siret || ""}
                    onChange={(e) => setProfile({ ...profile, siret: e.target.value })}
                    placeholder="123 456 789 00012"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NDE</label>
                  <input
                    type="text"
                    value={profile.nde || ""}
                    onChange={(e) => setProfile({ ...profile, nde: e.target.value })}
                    placeholder="12 34 56789 12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={profile.address || ""}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={profile.city || ""}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsable veille
                  </label>
                  <input
                    type="text"
                    value={profile.responsible_name || ""}
                    onChange={(e) => setProfile({ ...profile, responsible_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label>
                  <input
                    type="text"
                    value={profile.responsible_function || ""}
                    onChange={(e) => setProfile({ ...profile, responsible_function: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Méthodologie de veille
                </label>
                <textarea
                  value={profile.methodology_notes || ""}
                  onChange={(e) => setProfile({ ...profile, methodology_notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Décrivez votre méthodologie de veille..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </form>
          )}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <div className="space-y-6">
              {!canUseAlerts ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p className="mt-4 text-lg font-medium">Alertes personnalisées</p>
                    <p className="mt-2">Passez au plan Solo pour créer des alertes personnalisees.</p>
                  </div>
                  <Link href="/dashboard/abonnement" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Voir les offres
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium">Mes alertes</h2>
                    <button
                      onClick={() => setShowAlertForm(!showAlertForm)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      + Nouvelle alerte
                    </button>
                  </div>

                  {showAlertForm && (
                    <form onSubmit={handleCreateAlert} className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;alerte</label>
                        <input
                          type="text"
                          value={newAlert.name}
                          onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                          placeholder="Ex: AO Ile-de-France"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mots-cles (separes par virgule)</label>
                        <input
                          type="text"
                          value={newAlert.keywords}
                          onChange={(e) => setNewAlert({ ...newAlert, keywords: e.target.value })}
                          placeholder="Ex: CPF, VAE, Qualiopi"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Regions (optionnel)</label>
                          <input
                            type="text"
                            value={newAlert.regions}
                            onChange={(e) => setNewAlert({ ...newAlert, regions: e.target.value })}
                            placeholder="Ex: Ile-de-France, Auvergne-Rhone-Alpes"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
                          <select
                            value={newAlert.frequency}
                            onChange={(e) => setNewAlert({ ...newAlert, frequency: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="instant">Instantane</option>
                            <option value="daily">Quotidien</option>
                            <option value="weekly">Hebdomadaire</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Indicateurs Qualiopi</label>
                        <div className="flex flex-wrap gap-2">
                          {["23", "24", "25", "26"].map((ind) => (
                            <label key={ind} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newAlert.indicators.includes(ind)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewAlert({ ...newAlert, indicators: [...newAlert.indicators, ind] });
                                  } else {
                                    setNewAlert({ ...newAlert, indicators: newAlert.indicators.filter(i => i !== ind) });
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">Ind. {ind}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "Création..." : "Créer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAlertForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}

                  {alerts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Aucune alerte configuree</p>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium">{alert.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded ${alert.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                                {alert.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Mots-cles: {JSON.parse(alert.keywords).join(", ")}
                            </p>
                            {alert.regions && (
                              <p className="text-sm text-gray-500">Regions: {JSON.parse(alert.regions).join(", ")}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleAlert(alert.id, !!alert.active)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {alert.active ? "Desactiver" : "Activer"}
                            </button>
                            <button
                              onClick={() => handleDeleteAlert(alert.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "team" && (
            <div className="space-y-6">
              {!canUseTeams ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="mt-4 text-lg font-medium">Gestion d&apos;équipe</p>
                    <p className="mt-2">Passez au plan Équipe pour gérer une équipe de 5 personnes.</p>
                  </div>
                  <Link href="/dashboard/abonnement" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Voir les offres
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium">Mes équipes</h2>
                    <button
                      onClick={() => setShowTeamForm(!showTeamForm)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      + Nouvelle équipe
                    </button>
                  </div>

                  {showTeamForm && (
                    <form onSubmit={handleCreateTeam} className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;équipe</label>
                        <input
                          type="text"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="Ex: Équipe Formation"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "Création..." : "Créer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTeamForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}

                  {teams.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Aucune équipe créée</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Team list */}
                      {!selectedTeam && teams.map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            setSelectedTeam(team.id);
                            fetchTeamDetails(team.id);
                          }}
                        >
                          <div>
                            <h3 className="font-medium">{team.name}</h3>
                            <p className="text-sm text-gray-500">{team.member_count} membre(s)</p>
                          </div>
                          <span className="text-sm text-blue-600">Gerer</span>
                        </div>
                      ))}

                      {/* Team details */}
                      {selectedTeam && (
                        <div className="space-y-4">
                          <button
                            onClick={() => {
                              setSelectedTeam(null);
                              setTeamMembers([]);
                              setInvitations([]);
                            }}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            &larr; Retour aux équipes
                          </button>

                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">
                              {teams.find(t => t.id === selectedTeam)?.name}
                            </h3>
                            <button
                              onClick={() => setShowInviteForm(!showInviteForm)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                            >
                              + Inviter
                            </button>
                          </div>

                          {showInviteForm && (
                            <form onSubmit={handleInviteMember} className="bg-gray-50 p-4 rounded-lg space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                  <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="collegue@exemple.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                  <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="member">Membre</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex space-x-3">
                                <button
                                  type="submit"
                                  disabled={saving}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {saving ? "Envoi..." : "Envoyer l'invitation"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowInviteForm(false)}
                                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                                >
                                  Annuler
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Members list */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-gray-700">Membres</h4>
                            {teamMembers.map((member) => (
                              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="font-medium">{member.first_name} {member.last_name}</p>
                                  <p className="text-sm text-gray-500">{member.email}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    member.role === "owner" ? "bg-purple-100 text-purple-800" :
                                    member.role === "admin" ? "bg-blue-100 text-blue-800" :
                                    "bg-gray-100 text-gray-600"
                                  }`}>
                                    {member.role === "owner" ? "Propriétaire" : member.role === "admin" ? "Admin" : "Membre"}
                                  </span>
                                  {member.role !== "owner" && (
                                    <button
                                      onClick={() => handleRemoveMember(member.id)}
                                      className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                      Retirer
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Pending invitations */}
                          {invitations.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-gray-700">Invitations en attente</h4>
                              {invitations.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                                  <div>
                                    <p className="font-medium">{inv.email}</p>
                                    <p className="text-sm text-gray-500">Expire le {new Date(inv.expires_at).toLocaleDateString("fr-FR")}</p>
                                  </div>
                                  <span className="text-sm text-yellow-700">En attente</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Préférences AO Tab */}
          {activeTab === "préférences" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Préférences Appels d&apos;Offres</h2>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3">Régions cibles</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Sélectionnez les régions pour lesquelles vous souhaitez voir les appels d&apos;offres.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[
                    { id: "ile-de-france", label: "Île-de-France" },
                    { id: "auvergne-rhone-alpes", label: "Auvergne-Rhône-Alpes" },
                    { id: "hauts-de-france", label: "Hauts-de-France" },
                    { id: "nouvelle-aquitaine", label: "Nouvelle-Aquitaine" },
                    { id: "occitanie", label: "Occitanie" },
                    { id: "grand-est", label: "Grand Est" },
                    { id: "provence-alpes-cote-dazur", label: "PACA" },
                    { id: "pays-de-la-loire", label: "Pays de la Loire" },
                    { id: "bretagne", label: "Bretagne" },
                    { id: "normandie", label: "Normandie" },
                    { id: "bourgogne-franche-comte", label: "Bourgogne-Franche-Comté" },
                    { id: "centre-val-de-loire", label: "Centre-Val de Loire" },
                    { id: "corse", label: "Corse" },
                    { id: "guadeloupe", label: "Guadeloupe" },
                    { id: "martinique", label: "Martinique" },
                    { id: "guyane", label: "Guyane" },
                    { id: "reunion", label: "Réunion" },
                    { id: "mayotte", label: "Mayotte" },
                  ].map((region) => (
                    <label
                      key={region.id}
                      className="flex items-center space-x-2 p-2 bg-white rounded border hover:border-blue-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={preferredRegions.includes(region.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPreferredRegions([...preferredRegions, region.id]);
                          } else {
                            setPreferredRegions(preferredRegions.filter((r) => r !== region.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{region.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => {
                      setPreferredRegions([
                        "ile-de-france", "auvergne-rhone-alpes", "hauts-de-france",
                        "nouvelle-aquitaine", "occitanie", "grand-est",
                        "provence-alpes-cote-dazur", "pays-de-la-loire", "bretagne",
                        "normandie", "bourgogne-franche-comte", "centre-val-de-loire"
                      ]);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Tout sélectionner (métropole)
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setPreferredRegions([])}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Tout désélectionner
                  </button>
                </div>

                <button
                  onClick={async () => {
                    setSaving(true);
                    setMessage(null);
                    try {
                      const res = await fetch("/api/user", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ preferred_regions: preferredRegions }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      setMessage({ type: "success", text: "Préférences sauvegardées" });
                    } catch (error) {
                      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur" });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Sauvegarde..." : "Sauvegarder les préférences"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
