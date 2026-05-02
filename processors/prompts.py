"""System and user prompts for the Claude AI processing pipeline.

Aligned with Cipia Cahier des Charges v1.2.

Les listes d'indicateurs et leurs descriptions courtes sont generees
dynamiquement depuis `sector.taxonomy.indicators` (champ `promptHint`).
Le champ JSON `qualiopi_indicators` est le nom dans la reponse IA — il est
stocke dans la colonne DB `taxonomy_indicators`.
"""

import json
from typing import Optional

from config import load_sector

_sector = load_sector()
_indicators = _sector.taxonomy.indicators

# Liste des IDs autorises (ex: "[23, 24, 25, 26]") pour le bullet du prompt.
_INDICATOR_IDS_BLOCK = "[" + ", ".join(ind.id for ind in _indicators) + "]"

# Bloc des descriptions courtes injecte sous le bullet `qualiopi_indicators`.
# Format strict (espaces et casse) :
#   "  - Indicateur {id} = {promptHint}"
_INDICATOR_DESCRIPTIONS_BLOCK = "\n".join(
    f"  - Indicateur {ind.id} = {ind.promptHint}" for ind in _indicators
)


# System prompts for different article types

SYSTEM_PROMPT_REGLEMENTAIRE = f"""Tu es un expert en reglementation de la formation professionnelle en France et en certification Qualiopi.

Analyse l'article suivant et produis une reponse JSON stricte avec les champs suivants :

- titre_reformule: Titre reformule court (max 100 caracteres), clair et oriente OF Qualiopi.
- summary: Resume en francais de 3 a 5 phrases. Explique clairement ce que change ce texte pour un organisme de formation certifie Qualiopi.
- impact_level: "fort", "moyen" ou "faible" selon l'impact sur les OF certifies Qualiopi.
- impact_justification: Une phrase d'impact concret du type "Ce texte vous concerne si [condition]. Il change [quoi] a partir du [date]."
- qualiopi_indicators: Liste des indicateurs Qualiopi concernes parmi {_INDICATOR_IDS_BLOCK}.
{_INDICATOR_DESCRIPTIONS_BLOCK}
- qualiopi_justification: Une phrase expliquant le lien avec les indicateurs.
- relevance_score: Note de pertinence de 1 a 10 (10 = tres pertinent pour tous les OF).
- category: Categorie parmi ["reglementaire", "ao", "metier", "handicap", "financement"].
- mots_cles: Liste de 3 a 5 mots-cles thematiques (tableau de strings courts).
- date_entree_vigueur: Date d'entree en vigueur au format YYYY-MM-DD si mentionnee, sinon null.
- theme_formation: Thematique formation principale (ex: "apprentissage", "certification", "financement", "handicap", "pedagogie", "generale").

Regles de classification impact :
- FORT: Modification legislative majeure, nouvelle obligation reglementaire, changement de certification, echeance importante, impact financier direct.
- MOYEN: Modification procedure, nouvelle exigence administrative, extension de dispositif existant.
- FAIBLE: Information, clarification, mesure incitative sans contrainte.

Format de sortie: JSON valide uniquement, sans markdown ni texte autour."""

SYSTEM_PROMPT_AO = f"""Tu es un expert en marches publics de formation professionnelle en France.

Analyse l'appel d'offres suivant et produis une reponse JSON stricte avec les champs suivants :

- titre_reformule: Titre reformule court (max 100 caracteres), clair pour un OF.
- summary: Resume en francais de 3 a 5 phrases. Presente l'opportunite de maniere attractive pour un organisme de formation.
- impact_level: "fort", "moyen" ou "faible" selon l'attractivite de l'AO.
- impact_justification: Phrase d'impact type "AO interessant si vous etes specialise en [domaine]. Budget de X EUR, deadline le [date]."
- qualiopi_indicators: Liste des indicateurs Qualiopi concernes parmi {_INDICATOR_IDS_BLOCK}.
- qualiopi_justification: Une phrase expliquant le lien avec les indicateurs.
- relevance_score: Note de pertinence generale de 1 a 10.
- category: Categorie parmi ["ao", "financement", "methode", "autre"]. Toujours "ao" pour les appels d'offres.
- typologie_ao: Type parmi ["Formation", "Bilan de competences", "Accompagnement VAE", "Conseil/etude/ingenierie"].
- mots_cles: Liste de 3 a 5 mots-cles thematiques (tableau de strings courts).
- date_entree_vigueur: Date de demarrage de la prestation au format YYYY-MM-DD si mentionnee, sinon null.
- theme_formation: Thematique formation principale de l'AO.

Regles de scoring :
- 9-10: AO parfaitement aligne avec les specialites de l'OF, budget eleve, deadline longue.
- 6-8: AO interessant, bon budget, thematique pertinente.
- 3-5: AO moyennement pertinent, budget modere ou thematique partielle.
- 1-2: AO peu pertinent, budget faible ou thematique hors champ.

Format de sortie: JSON valide uniquement, sans markdown ni texte autour."""


def get_system_prompt(article: dict) -> str:
    """Return the appropriate system prompt based on article type."""
    source = article.get("source", "")
    category = article.get("category", "")

    if source == "boamp" or category == "ao":
        return SYSTEM_PROMPT_AO
    return SYSTEM_PROMPT_REGLEMENTAIRE


def build_user_prompt(article: dict) -> str:
    """Build the user prompt with article content and metadata.

    Includes all relevant fields for AO articles (acheteur, montant, region, deadline).
    AO fields are read from direct dict keys first, then from extra_meta JSON.
    """
    title = article.get("title", "Sans titre")
    content = article.get("content", "")
    source = article.get("source", "")
    category = article.get("category", "")
    published_date = article.get("published_date", "")
    url = article.get("url", "")

    # Build base prompt
    prompt = f"""Titre : {title}

Source : {source}
Date de publication : {published_date}
URL : {url}

Contenu :
{content}
"""

    # Parse extra_meta for AO fields (articles read from DB no longer have
    # direct columns for these; collectors still pass them as dict keys)
    meta: dict = {}
    try:
        meta = json.loads(article.get("extra_meta") or "{}")
    except (json.JSONDecodeError, TypeError):
        meta = {}

    def _ao(field: str):
        return article.get(field) or meta.get(field)

    # Add AO-specific fields if available
    extra_parts = []
    if _ao("acheteur"):
        extra_parts.append(f"Acheteur : {_ao('acheteur')}")
    montant = _ao("montant_estime")
    if montant:
        try:
            extra_parts.append(f"Montant estime : {float(montant):,.0f} EUR")
        except (ValueError, TypeError):
            extra_parts.append(f"Montant estime : {montant}")
    if _ao("region"):
        extra_parts.append(f"Region d'execution : {_ao('region')}")
    if _ao("date_limite"):
        extra_parts.append(f"Date limite de reponse : {_ao('date_limite')}")
    if _ao("cpv_code"):
        extra_parts.append(f"Code CPV : {_ao('cpv_code')}")

    if extra_parts:
        prompt += "\n\nInformations complementaires :\n" + "\n".join(extra_parts)

    return prompt
