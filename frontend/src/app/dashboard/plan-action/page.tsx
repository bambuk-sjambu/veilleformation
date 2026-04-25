"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  User,
  Trash2,
  Edit3,
  X,
  ExternalLink,
} from "lucide-react";

interface Action {
  id: number;
  article_id: number;
  action_description: string;
  responsible: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  article_title?: string | null;
  article_category?: string | null;
  article_source?: string | null;
}

interface Article {
  id: number;
  title: string;
  category: string | null;
  source: string;
}

const STATUS_CONFIG = {
  a_faire: { label: "A faire", color: "bg-gray-100 text-gray-700", icon: Clock },
  en_cours: { label: "En cours", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  fait: { label: "Fait", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  annule: { label: "Annule", color: "bg-red-100 text-red-700", icon: XCircle },
};

const PRIORITY_CONFIG = {
  basse: { label: "Basse", color: "text-gray-500" },
  moyenne: { label: "Moyenne", color: "text-amber-600" },
  haute: { label: "Haute", color: "text-red-600" },
};

export default function PlanActionPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [formData, setFormData] = useState({
    article_id: "",
    action_description: "",
    responsible: "",
    status: "a_faire",
    priority: "moyenne",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchActions();
    fetchArticles();
  }, []);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/actions");
      const data = await res.json();
      setActions(data.actions || []);
    } catch (error) {
      console.error("Error fetching actions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/articles?limit=500&status=done");
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      article_id: parseInt(formData.article_id, 10),
      due_date: formData.due_date || null,
      responsible: formData.responsible || null,
      notes: formData.notes || null,
    };

    try {
      if (editingAction) {
        const res = await fetch(`/api/actions/${editingAction.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchActions();
          closeModal();
        }
      } else {
        const res = await fetch("/api/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchActions();
          closeModal();
        }
      }
    } catch (error) {
      console.error("Error saving action:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette action ?")) return;

    try {
      const res = await fetch(`/api/actions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setActions(actions.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Error deleting action:", error);
    }
  };

  const handleStatusChange = async (action: Action, newStatus: string) => {
    try {
      const res = await fetch(`/api/actions/${action.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchActions();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const openModal = (action?: Action) => {
    if (action) {
      setEditingAction(action);
      setFormData({
        article_id: action.article_id.toString(),
        action_description: action.action_description,
        responsible: action.responsible || "",
        status: action.status,
        priority: action.priority,
        due_date: action.due_date || "",
        notes: action.notes || "",
      });
    } else {
      setEditingAction(null);
      setFormData({
        article_id: "",
        action_description: "",
        responsible: "",
        status: "a_faire",
        priority: "moyenne",
        due_date: "",
        notes: "",
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAction(null);
  };

  const filteredActions = actions.filter((action) => {
    const matchesSearch =
      action.action_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (action.article_title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (action.responsible?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || action.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedActions = {
    a_faire: filteredActions.filter((a) => a.status === "a_faire"),
    en_cours: filteredActions.filter((a) => a.status === "en_cours"),
    fait: filteredActions.filter((a) => a.status === "fait"),
    annule: filteredActions.filter((a) => a.status === "annule"),
  };

  const stats = {
    total: actions.length,
    a_faire: actions.filter((a) => a.status === "a_faire").length,
    en_cours: actions.filter((a) => a.status === "en_cours").length,
    fait: actions.filter((a) => a.status === "fait").length,
    haute: actions.filter((a) => a.priority === "haute" && a.status !== "fait" && a.status !== "annule").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan d&apos;action</h1>
          <p className="text-gray-500 mt-1">
            Gérez vos actions suite a la veille réglementaire
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle action
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">A faire</p>
          <p className="text-2xl font-bold text-gray-700">{stats.a_faire}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">En cours</p>
          <p className="text-2xl font-bold text-blue-600">{stats.en_cours}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Terminees</p>
          <p className="text-2xl font-bold text-green-600">{stats.fait}</p>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-4 bg-red-50">
          <p className="text-sm text-red-600">Priorite haute</p>
          <p className="text-2xl font-bold text-red-600">{stats.haute}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par action, article, responsable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="a_faire">A faire</option>
              <option value="en_cours">En cours</option>
              <option value="fait">Fait</option>
              <option value="annule">Annule</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Actions List */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement des actions...</p>
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {actions.length === 0 ? "Aucune action" : "Aucun resultat"}
          </h3>
          <p className="text-gray-500 mb-4">
            {actions.length === 0
              ? "Commencez par créer votre première action"
              : "Essayez de modifier vos filtres"}
          </p>
          {actions.length === 0 && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Créer une action
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Kanban-style columns */}
          {(["a_faire", "en_cours", "fait"] as const).map((status) => (
            <div key={status} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className={`px-4 py-3 border-b border-gray-200 ${STATUS_CONFIG[status].color}`}>
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = STATUS_CONFIG[status].icon;
                    return <Icon className="w-4 h-4" />;
                  })()}
                  <span className="font-medium">{STATUS_CONFIG[status].label}</span>
                  <span className="ml-auto text-sm">
                    {groupedActions[status].length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {groupedActions[status].map((action) => (
                  <div key={action.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${PRIORITY_CONFIG[action.priority as keyof typeof PRIORITY_CONFIG].color}`}>
                            {PRIORITY_CONFIG[action.priority as keyof typeof PRIORITY_CONFIG].label}
                          </span>
                          {action.due_date && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(action.due_date).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 font-medium mb-1">
                          {action.action_description}
                        </p>
                        {action.article_title && (
                          <a
                            href={`/dashboard/veille`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {action.article_title}
                          </a>
                        )}
                        {action.responsible && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            {action.responsible}
                          </p>
                        )}
                        {action.notes && (
                          <p className="text-sm text-gray-400 mt-2 italic">
                            {action.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={action.status}
                          onChange={(e) => handleStatusChange(action, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="a_faire">A faire</option>
                          <option value="en_cours">En cours</option>
                          <option value="fait">Fait</option>
                          <option value="annule">Annule</option>
                        </select>
                        <button
                          onClick={() => openModal(action)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(action.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {groupedActions[status].length === 0 && (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    Aucune action
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Cancelled actions (collapsed) */}
          {groupedActions.annule.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden opacity-60">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-100 text-gray-500">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  <span className="font-medium">Annulees</span>
                  <span className="ml-auto text-sm">{groupedActions.annule.length}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {groupedActions.annule.map((action) => (
                  <div key={action.id} className="p-4">
                    <p className="text-gray-500 line-through">{action.action_description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAction ? "Modifier l'action" : "Nouvelle action"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Article concerné *
                </label>
                <select
                  required
                  value={formData.article_id}
                  onChange={(e) => setFormData({ ...formData, article_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Sélectionner un article...</option>
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description de l&apos;action *
                </label>
                <textarea
                  required
                  value={formData.action_description}
                  onChange={(e) => setFormData({ ...formData, action_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex : Mettre à jour le formulaire d'inscription..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={formData.responsible}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Nom ou email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Échéance
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="a_faire">A faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="fait">Fait</option>
                    <option value="annule">Annule</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorite
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Informations complementaires..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {editingAction ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
