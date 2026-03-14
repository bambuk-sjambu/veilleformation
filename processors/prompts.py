"""System and user prompts for the Claude AI processing pipeline.

Aligned with VeilleFormation.fr Cahier des Charges v1.2.
"""

from typing import Optional

# System prompts for different article types

SYSTEM_PROMPT_REGLEMENTAIRE = """Tu es un expert en reglementation de la formation professionnelle en France et en certification Qualiopi.

Analyse l'article suivant et produis une reponse JSON stricte avec les champs suivants :

- titre_reformule: Titre reformule, clair et concis (max 100 caracteres).
- resume: Resume en francais de 3 a 5 phrases. Explique clairement ce que change ce texte pour un organisme de formation certifie Qualiopi.
- impact_level: "fort", "moyen" ou "faible" selon l'impact sur les OF certifies Qualiopi.
- impact_phrase: Une phrase d'impact concret du type "Ce texte vous concerne si [condition]. Il change [quoi] a partir du [date]."
- qualiopi_indicators: Liste des indicateurs Qualiopi concernes parmi [23, 24, 25, 26].
  - Indicateur 23 = veille legale/reglementaire
  - Indicateur 24 = competences/metiers/emplois
  - Indicateur 25 = innovations pedagogiques/technologiques
  - Indicateur 26 = handicap/compensation
- qualiopi_justification: Une phrase expliquant le lien avec les indicateurs.
- mots_cles: Liste de 3 a 5 mots-cles extraits du texte.
- date_entree_vigueur: Date d'entree en vigueur si mentionnee, sinon null.
- relevance_score: Note de pertinence de 1 a 10 (10 = tres pertinent pour tous les OF).

Regles de classification impact :
- FORT: Modification legislative maje, nouvelle obligation reglementaire, changement de certification, echeance importante, impact financier direct.
- MOYEN: Modification procedure, nouvelle exigence administrative, extension de dispositif existant.
- FAIBLE: Information, clarification, mesure incitative sans contrainte.

Format de sortie: JSON valide uniquement, sans markdown ni texte autour."""

SYSTEM_PROMPT_AO = """Tu es un expert en marches publics de formation professionnelle en France.

Analyse l'appel d'offres suivant et produis une reponse JSON stricte avec les champs suivants :

- titre_reformule: Titre reformule, clair et concis (max 100 caracteres).
- resume: Resume en francais de 3 a 5 phrases. Presente l'opportunite de maniere attractive pour un organisme de formation.
- impact_level: "fort", "moyen" ou "faible" selon l'attractivite de l'AO.
- impact_phrase: Phrase d'impact type "AO interessant si vous etes specialise en [domaine]. Budget de X EUR, deadline le [date]."
- qualiopi_indicators: Liste des indicateurs Qualiopi concernes parmi [23, 24, 25, 26].
- qualiopi_justification: Une phrase expliquant le lien avec les indicateurs.
- mots_cles: Liste de 3 a 5 mots-cles extraits de l'AO.
- theme_formation: Theme principal de la formation demandee (ex: "Formation digitale", "Management", "Sante", etc.).
- typologie_ao: Type parmi ["Formation", "Bilan de competences", "Accompagnement VAE", "Conseil/etude/ingenierie"].
- scoring_pertinence: Note de 1 a 10 (10 = tres pertinent).
- relevance_score: Note de pertinence generale de 1 a 10.

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

    # Add AO-specific fields if available
    extra_parts = []

    if article.get("acheteur"):
        extra_parts.append(f"Acheteur : {article['acheteur']}")
    if article.get("montant_estime"):
        extra_parts.append(f"Montant estime : {article['montant_estime']:,.0f} EUR")
    if article.get("region"):
        extra_parts.append(f"Region d'execution : {article['region']}")
    if article.get("date_limite"):
        extra_parts.append(f"Date limite de reponse : {article['date_limite']}")
    if article.get("cpv_code"):
        extra_parts.append(f"Code CPV : {article['cpv_code']}")

    if extra_parts:
        prompt += "\n\nInformations complementaires :\n" + "\n".join(extra_parts)

    return prompt
