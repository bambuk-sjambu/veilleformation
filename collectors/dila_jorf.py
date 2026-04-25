"""DILA JORF collector — Journal Officiel via dumps quotidiens DILA.

Source : https://echanges.dila.gouv.fr/OPENDATA/JORF/

Chaque jour, DILA publie un dump tar.gz (~300 KB) contenant tous les
décrets/arrêtés/lois/décisions parus au Journal Officiel. Le sommaire
JORFCONT*.xml liste tous les textes via des éléments :

    <LIEN_TXT idtxt="JORFTEXTxxxxxxx" titretxt="Décret du ... relatif à ..."/>

Ce collector télécharge les dumps des N derniers jours, parse les sommaires
et filtre par mots-clés formation/Qualiopi pour ne retenir que les textes
pertinents.

Source ultra-stable (gov.fr, dump quotidien public, format XML stable).
"""

import io
import re
import tarfile
import time
from datetime import datetime, timedelta
from typing import Optional
from xml.etree import ElementTree as ET

import requests

from collectors.base import BaseCollector
from storage.monitoring import send_monitoring_alert

INDEX_URL = "https://echanges.dila.gouv.fr/OPENDATA/JORF/"
RETRY_DELAYS = [10, 30, 60]
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) Cipia/1.0 +https://cipia.fr"

# Mots-clés stricts (matchent un mot ou une expression précise sur le titre JORF).
# Contraintes : formulations spécifiques au domaine formation pro pour éviter le bruit.
KEYWORDS_STRICT = [
    "formation professionnelle",
    "formation continue",
    "formations professionnelles",
    "organisme de formation",
    "organismes de formation",
    "centre de formation d'apprentis",
    "compte personnel de formation",
    "compte personnel d'activité",
    "apprentissage",
    "apprenti",
    "alternance",
    "alternant",
    "qualiopi",
    "OPCO",
    "France compétences",
    "France Travail",
    "Pôle emploi",
    "validation des acquis",
    "VAE",
    "bilan de compétences",
    "professionnalisation",
    "reconversion professionnelle",
    "insertion professionnelle",
    "demandeur d'emploi",
    "demandeurs d'emploi",
    "certification professionnelle",
    "RNCP",
    "répertoire national des certifications",
    "régies par le code du travail",
    "stagiaire de la formation",
]

# Patterns de bruit à exclure (administratif, militaire, etc.)
EXCLUSIONS = [
    "délégation de signature",
    "portant nomination",
    "nomination au cabinet",
    "portant création de zones",
    "zones interdites",
    "portant habilitation de la marine",
    "marine nationale",
    "réserve opérationnelle",
    "formation politique",
    "formation des magistrats",
    "formation des juges",
    "formation collégiale",
]


def _matches_keywords(title: str) -> bool:
    """True si le titre matche un keyword strict et aucun pattern exclu."""
    if not title:
        return False
    low = title.lower()
    if any(ex.lower() in low for ex in EXCLUSIONS):
        return False
    return any(kw.lower() in low for kw in KEYWORDS_STRICT)


# Pattern de nom de fichier dump : JORF_20260425-010120.tar.gz
_DUMP_RE = re.compile(r"JORF_(\d{8})-(\d{6})\.tar\.gz")


class DILAJorfCollector(BaseCollector):
    """Collect texts from JORF (Journal Officiel) DILA dumps."""

    SOURCE_NAME = "jorf"

    def __init__(self, db_path: str, logger=None, days_back: int = 7):
        super().__init__(db_path, logger)
        self.days_back = days_back

    def _list_dumps(self) -> list[tuple[str, str]]:
        """List dump files available on the DILA server.

        Returns:
            List of (filename, date_yyyymmdd) tuples, sorted desc by date.
        """
        try:
            r = requests.get(
                INDEX_URL,
                headers={"User-Agent": USER_AGENT},
                timeout=30,
            )
            r.raise_for_status()
        except requests.RequestException as e:
            self.logger.error(f"DILA: impossible de lister les dumps: {e}")
            return []

        cutoff = (datetime.now() - timedelta(days=self.days_back)).strftime("%Y%m%d")
        dumps = []
        for match in _DUMP_RE.finditer(r.text):
            filename = match.group(0)
            date_str = match.group(1)
            if date_str >= cutoff:
                dumps.append((filename, date_str))

        # Tri desc par date+heure
        dumps.sort(key=lambda x: x[0], reverse=True)
        return dumps

    def _fetch_dump(self, filename: str) -> Optional[bytes]:
        """Télécharge un dump tar.gz avec retry."""
        url = f"{INDEX_URL}{filename}"
        last_error = None
        for attempt, delay in enumerate(RETRY_DELAYS):
            try:
                r = requests.get(
                    url,
                    headers={"User-Agent": USER_AGENT},
                    timeout=60,
                )
                r.raise_for_status()
                return r.content
            except requests.RequestException as e:
                last_error = e
                self.logger.warning(
                    f"DILA dump {filename} tentative {attempt + 1}: {e}"
                )
                if attempt < len(RETRY_DELAYS) - 1:
                    time.sleep(delay)
        self.logger.error(f"DILA: dump {filename} echec final - {last_error}")
        return None

    def _extract_texts(self, dump_bytes: bytes, date_str: str) -> list[dict]:
        """Parse les CONT dans le tar.gz et extrait les textes pertinents.

        Args:
            dump_bytes: Contenu raw du tar.gz
            date_str: Date YYYYMMDD du dump (utilisée en published_date)

        Returns:
            Liste d'articles structurés.
        """
        articles: list[dict] = []
        try:
            with tarfile.open(fileobj=io.BytesIO(dump_bytes), mode="r:gz") as tar:
                for member in tar.getmembers():
                    if not member.isfile():
                        continue
                    if "/JORFCONT" not in member.name or not member.name.endswith(".xml"):
                        continue

                    f = tar.extractfile(member)
                    if not f:
                        continue
                    xml_data = f.read()

                    try:
                        root = ET.fromstring(xml_data)
                    except ET.ParseError as e:
                        self.logger.warning(f"DILA: XML parse error {member.name}: {e}")
                        continue

                    # Le sommaire CONT contient une arborescence de TM (tables des matières)
                    # avec des LIEN_TXT à différents niveaux.
                    for lien in root.iter("LIEN_TXT"):
                        idtxt = lien.get("idtxt", "").strip()
                        titretxt = lien.get("titretxt", "").strip()
                        if not idtxt or not titretxt:
                            continue
                        if not _matches_keywords(titretxt):
                            continue

                        # Trouver le ministère parent (TITRE_TM le plus proche en remontant)
                        # ElementTree n'expose pas .parent — on accepte de ne pas l'avoir.
                        ministere = ""

                        published = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                        articles.append({
                            "source": self.SOURCE_NAME,
                            "source_id": f"jorf-{idtxt}",
                            "title": titretxt,
                            "url": f"https://www.legifrance.gouv.fr/jorf/id/{idtxt}",
                            "content": titretxt,
                            "published_date": published,
                            "category": "reglementaire",
                            "status": "new",
                        })
        except tarfile.TarError as e:
            self.logger.error(f"DILA: tar error: {e}")

        return articles

    def collect(self) -> list[dict]:
        """Récupère les textes JORF des N derniers jours matchant les keywords."""
        dumps = self._list_dumps()
        if not dumps:
            self.logger.warning("DILA: aucun dump trouve")
            send_monitoring_alert(
                db_path=self.db_path,
                severity="warning",
                alert_type="no_dumps",
                source="jorf",
                message="DILA JORF: aucun dump disponible",
            )
            return []

        # Dédoublonner par jour : si plusieurs dumps même date, prendre le dernier
        seen_dates = set()
        unique_dumps = []
        for filename, date_str in dumps:
            if date_str not in seen_dates:
                seen_dates.add(date_str)
                unique_dumps.append((filename, date_str))

        self.logger.info(f"DILA: {len(unique_dumps)} dumps a parser (last {self.days_back}j)")

        all_articles: list[dict] = []
        seen_ids: set = set()

        for filename, date_str in unique_dumps:
            self.logger.info(f"DILA: dl + parse {filename}")
            dump_bytes = self._fetch_dump(filename)
            if not dump_bytes:
                continue

            extracted = self._extract_texts(dump_bytes, date_str)
            for art in extracted:
                if art["source_id"] in seen_ids:
                    continue
                seen_ids.add(art["source_id"])
                all_articles.append(art)

            self.logger.info(
                f"DILA: {filename} -> {len(extracted)} articles formation matches"
            )

        self.logger.info(f"DILA JORF: {len(all_articles)} articles uniques collectes")
        return all_articles
