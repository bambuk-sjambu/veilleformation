"""DILA JORF — Collecteur santé / médical libéral.

Réutilise la logique de DILAJorfCollector (téléchargement + parse des dumps
JORF de la DILA) mais filtre sur des mots-clés spécifiques au secteur
médical : Code de la santé publique, conventions Sécurité Sociale,
nomenclatures CCAM/NGAP, professions de santé, déontologie médicale.

Pivot multi-secteurs (X.5).

Note : seuls des keywords longs (> 5 chars) sont utilisés pour éviter les
faux positifs (ex: "ars" matchait "mars"). Les sigles courts comme HAS,
CNAM, ARS, ALD, DPC, NGAP, CCAM ne sont pas dans la liste — on les capte
indirectement via leurs formulations longues ("Haute Autorité de santé",
"Agence régionale de santé", etc.).
"""

from collectors.dila_jorf import DILAJorfCollector


# Mots-clés stricts pour la veille médicale libérale.
# Liste resserrée pour ne capter que les textes qui concernent vraiment
# les professions de santé libérales. Les keywords trop larges
# ("sécurité sociale", "avenant à la convention") ont été retirés car
# ils matchent énormément de textes hors-périmètre (conventions collectives
# BTP/sucreries/etc., textes RSA, retraites…).
KEYWORDS_MEDICAL = [
    # Code et institutions (formulation longue uniquement)
    "code de la santé publique",
    # "code de la sécurité sociale" : trop large (RSA, retraites…)
    # → captés autrement via 'spécialités pharmaceutiques', 'ALD', 'convention médicale'
    "agence régionale de santé",
    "agences régionales de santé",
    "Haute Autorité de santé",
    "haute autorité de santé",
    # Professionnels de santé (très spécifiques)
    "professionnel de santé",
    "professionnels de santé",
    "auxiliaire médical",
    "auxiliaires médicaux",
    "kinésithérapeute",
    "masseur-kinésithérapeute",
    "ostéopathe",
    "sage-femme",
    "sages-femmes",
    "chirurgien-dentiste",
    "chirurgiens-dentistes",
    "pédicure-podologue",
    "orthophoniste",
    "orthoptiste",
    "psychomotricien",
    # Conventions médicales spécifiques (pas les conv. collectives quelconques)
    "convention nationale des médecins",
    "convention nationale destinée à organiser les rapports",
    "convention nationale organisant les rapports",
    "convention médicale",
    "nomenclature générale des actes",
    "classification commune des actes médicaux",
    "actes infirmiers",
    "actes médicaux et dentaires",
    # Médicaments / dispositifs
    "dispositif médical",
    "dispositifs médicaux",
    "pharmacovigilance",
    "remboursement de médicaments",
    "spécialités pharmaceutiques",
    "ANSM",  # 4 lettres mais sigle distinctif
    # Exercice et déontologie
    "exercice de la profession de médecin",
    "exercice de la médecine",
    "déontologie médicale",
    "ordre des médecins",
    "ordre des pharmaciens",
    "ordre national des médecins",
    "ordre national des infirmiers",
    "développement professionnel continu",
    # Parcours et recommandations
    "affection de longue durée",
    "affections de longue durée",
    "recommandation de bonne pratique",
    "recommandations de bonne pratique",
    "bonnes pratiques cliniques",
    "parcours de soins",
]

# Patterns à exclure pour limiter le bruit administratif.
EXCLUSIONS_MEDICAL = [
    "nomination au cabinet",
    "portant nomination",
    "délégation de signature",
    "marine nationale",
    "réserve opérationnelle",
    "police nationale",
    # Évite les "santé animale" / vétérinaire
    "santé animale",
    "santé des végétaux",
    "police sanitaire des animaux",
    # Évite les concours administratifs sans portée réglementaire pour les libéraux
    "ouverture d'un concours",
    "ouverture des concours",
    "concours de recrutement",
    "admission à la retraite",
]


class DILAJorfMedicalCollector(DILAJorfCollector):
    """Collecteur JORF filtré sur le secteur médical libéral.

    Hérite de DILAJorfCollector pour réutiliser le téléchargement des dumps
    et le parsing TAR. Le filtre par mots-clés est spécialisé via les
    attributs de classe KEYWORDS_STRICT / EXCLUSIONS.
    """

    SOURCE_NAME = "jorf_medical"
    SECTOR_ID = "medical"
    KEYWORDS_STRICT = KEYWORDS_MEDICAL
    EXCLUSIONS = EXCLUSIONS_MEDICAL
