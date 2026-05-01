"""Chargeur de la config secteur cote Python.

Lit le JSON `/config/sectors/<id>.json` et expose un dataclass typee.
Source de verite partagee avec le frontend Next.js.

Usage :
    from config import load_sector
    sector = load_sector()
    print(sector.brand.name)  # "Cipia"
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List


@dataclass(frozen=True)
class TaxonomyIndicator:
    id: str
    short: str
    label: str
    description: str
    promptHint: str


@dataclass(frozen=True)
class BrandConfig:
    name: str
    legalName: str
    domain: str
    tagline: str
    description: str
    logoUrl: str
    colorPrimary: str
    colorAccent: str


@dataclass(frozen=True)
class VocabConfig:
    audience: str
    audienceShort: str
    regulatorName: str
    auditName: str
    regulatorRefName: str


@dataclass(frozen=True)
class TaxonomyConfig:
    indicators: List[TaxonomyIndicator]
    categories: List[str]


@dataclass(frozen=True)
class AuditPdfSectionsConfig:
    summary: str
    impactDistribution: str
    sources: str
    methodology: str
    actions: str
    detailByIndicator: str


@dataclass(frozen=True)
class AuditPdfSummaryLabelsConfig:
    articles: str
    actionsDone: str
    actionsInProgress: str
    actionsTodo: str
    firstIndicator: str


@dataclass(frozen=True)
class AuditPdfImpactLabelsConfig:
    fort: str
    moyen: str
    faible: str


@dataclass(frozen=True)
class AuditPdfActionStatusLabelsConfig:
    done: str
    inProgress: str
    todo: str


@dataclass(frozen=True)
class AuditPdfSignatureLabelsConfig:
    responsibleRole: str
    directorRole: str
    nameAndSignaturePlaceholder: str


@dataclass(frozen=True)
class AuditPdfConfig:
    coverTitle: str
    coverSubtitle: str
    coverFooter: str
    reportTitle: str
    pageFooter: str
    pageFooterShort: str
    sections: AuditPdfSectionsConfig
    summaryLabels: AuditPdfSummaryLabelsConfig
    impactLabels: AuditPdfImpactLabelsConfig
    actionStatusLabels: AuditPdfActionStatusLabelsConfig
    signatureLabels: AuditPdfSignatureLabelsConfig
    sourceLabels: Dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class SectorConfig:
    id: str
    brand: BrandConfig
    vocab: VocabConfig
    taxonomy: TaxonomyConfig
    audit_pdf: AuditPdfConfig


# Le JSON est physiquement dans frontend/ (Next.js refuse les imports hors
# de sa racine). Le loader Python lit le meme fichier pour garantir l'unicite
# de la source de verite.
_SECTORS_DIR = Path(__file__).parent.parent / "frontend" / "src" / "config" / "sectors"


def load_sector(sector_id: str | None = None) -> SectorConfig:
    """Charge la config du secteur actif.

    L'ID est lu depuis :
    1. l'argument `sector_id` si fourni
    2. la variable d'env `SECTOR`
    3. fallback "cipia"
    """
    sid = sector_id or os.environ.get("SECTOR") or "cipia"
    path = _SECTORS_DIR / f"{sid}.json"
    if not path.exists():
        available = sorted(p.stem for p in _SECTORS_DIR.glob("*.json"))
        raise ValueError(
            f'Secteur inconnu: "{sid}". Disponibles : {", ".join(available)}'
        )

    with path.open(encoding="utf-8") as f:
        raw = json.load(f)

    brand = BrandConfig(
        name=raw["brand"]["name"],
        legalName=raw["brand"].get("legalName", raw["brand"]["name"]),
        domain=raw["brand"]["domain"],
        tagline=raw["brand"]["tagline"],
        description=raw["brand"]["description"],
        logoUrl=raw["brand"]["logoUrl"],
        colorPrimary=raw["brand"]["colorPrimary"],
        colorAccent=raw["brand"]["colorAccent"],
    )
    vocab = VocabConfig(**raw["vocab"])
    taxonomy = TaxonomyConfig(
        indicators=[TaxonomyIndicator(**i) for i in raw["taxonomy"]["indicators"]],
        categories=list(raw["taxonomy"]["categories"]),
    )
    pdf_raw = raw["audit_pdf"]
    audit_pdf = AuditPdfConfig(
        coverTitle=pdf_raw["coverTitle"],
        coverSubtitle=pdf_raw["coverSubtitle"],
        coverFooter=pdf_raw["coverFooter"],
        reportTitle=pdf_raw["reportTitle"],
        pageFooter=pdf_raw["pageFooter"],
        pageFooterShort=pdf_raw["pageFooterShort"],
        sections=AuditPdfSectionsConfig(**pdf_raw["sections"]),
        summaryLabels=AuditPdfSummaryLabelsConfig(**pdf_raw["summaryLabels"]),
        impactLabels=AuditPdfImpactLabelsConfig(**pdf_raw["impactLabels"]),
        actionStatusLabels=AuditPdfActionStatusLabelsConfig(
            **pdf_raw["actionStatusLabels"]
        ),
        signatureLabels=AuditPdfSignatureLabelsConfig(**pdf_raw["signatureLabels"]),
        sourceLabels=dict(pdf_raw.get("sourceLabels", {})),
    )
    return SectorConfig(
        id=raw["id"],
        brand=brand,
        vocab=vocab,
        taxonomy=taxonomy,
        audit_pdf=audit_pdf,
    )
