"""Tests for the RappelConso V2 collector."""

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from collectors.rappel_conso import (
    ARTICLE_CATEGORY,
    PAGE_LIMIT,
    RappelConsoCollector,
)
from storage.database import get_articles, get_connection, init_db


# ----------------------------------------------------------------
# Fixtures
# ----------------------------------------------------------------

@pytest.fixture
def db_path():
    """Crée une base SQLite temporaire pour chaque test."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    os.unlink(path)


# ----------------------------------------------------------------
# Sample API responses (schema réel observé sur l'API live, 2026-05-02)
# ----------------------------------------------------------------

SAMPLE_RECORD = {
    "id": 97,
    "numero_fiche": "2026-04-0331",
    "date_publication": "2026-05-01T08:19:50+00:00",
    "categorie_produit": "alimentation",
    "sous_categorie_produit": "fruits et légumes",
    "marque_produit": "les vergers gourmands",
    "modeles_ou_references": "lot 250g - DLC 2026-05-15",
    "libelle": "fraises Charlotte 250g",
    "motif_rappel": "présence de Listeria monocytogenes",
    "risques_encourus": "Listériose (infection bactérienne grave)",
    "description_complementaire_risque": "Femmes enceintes et personnes immunodéprimées particulièrement exposées",
    "preconisations_sanitaires": "Consulter un médecin en cas de symptôme",
    "conduites_a_tenir_par_le_consommateur": "ne plus consommer|rapporter le produit au point de vente|détruire le produit",
    "distributeurs": "Carrefour¤¤Monoprix",
    "zone_geographique_de_vente": "France entière",
    "lien_vers_la_fiche_rappel": "https://rappel.conso.gouv.fr/fiche-rappel/12345/interne",
    "lien_vers_affichette_pdf": "https://rappel.conso.gouv.fr/affichettepdf/12345/interne",
}

SAMPLE_PAYLOAD_PAGE_1 = {
    "total_count": 2,
    "results": [
        SAMPLE_RECORD,
        {
            **SAMPLE_RECORD,
            "id": 98,
            "numero_fiche": "2026-04-0332",
            "date_publication": "2026-04-30T21:45:10+00:00",
            "marque_produit": "gourmet çelebi",
            "sous_categorie_produit": "cacao, café et thé",
            "libelle": "café moulu arabica 500g",
            "motif_rappel": "présence d'oxyde d'éthylène",
        },
    ],
}

SAMPLE_PAYLOAD_EMPTY = {"total_count": 0, "results": []}


# ----------------------------------------------------------------
# Tests parsing
# ----------------------------------------------------------------

class TestRappelConsoParsing:
    """Vérifie le mapping record Opendatasoft -> dict Cipia."""

    def test_parses_single_record(self, db_path):
        collector = RappelConsoCollector(db_path)
        article = collector._parse_record(SAMPLE_RECORD)

        assert article["source"] == "rappel_conso"
        # source_id = source + numero_fiche stable
        assert article["source_id"] == "rappel_conso-2026-04-0331"
        assert article["status"] == "new"
        assert article["category"] == ARTICLE_CATEGORY
        assert article["published_date"] == "2026-05-01"
        assert article["url"] == "https://rappel.conso.gouv.fr/fiche-rappel/12345/interne"

        # Le titre concatène marque + sous-catégorie + libellé.
        title = article["title"]
        assert "Vergers Gourmands" in title or "vergers gourmands" in title.lower()
        assert "fruits et légumes" in title.lower()
        assert "fraises Charlotte" in title

        # Le content concatène motif + risques + conduite à tenir.
        content = article["content"]
        assert "Listeria monocytogenes" in content
        assert "Listériose" in content
        assert "ne plus consommer" in content
        assert "rapporter le produit" in content
        # Le séparateur étrange "¤¤" doit être nettoyé.
        assert "¤" not in content
        assert "Carrefour" in content and "Monoprix" in content

    def test_parses_record_without_libelle(self, db_path):
        record = {**SAMPLE_RECORD, "libelle": "", "modeles_ou_references": ""}
        collector = RappelConsoCollector(db_path)
        article = collector._parse_record(record)
        # Doit toujours produire un titre exploitable (marque + sous-catégorie).
        assert article["title"]
        assert "vergers gourmands" in article["title"].lower()

    def test_parses_record_with_only_id(self, db_path):
        record = {"id": 9999, "date_publication": "2026-04-15T10:00:00+00:00"}
        collector = RappelConsoCollector(db_path)
        article = collector._parse_record(record)
        # Fallback : on a au moins un title et un source_id stable.
        assert article["source_id"] == "rappel_conso-9999"
        assert article["title"]
        assert article["published_date"] == "2026-04-15"

    def test_parse_date_iso8601(self):
        assert (
            RappelConsoCollector._parse_date("2026-05-01T08:19:50+00:00")
            == "2026-05-01"
        )

    def test_parse_date_invalid(self):
        assert RappelConsoCollector._parse_date(None) is None
        # str non parseable → fallback sur les 10 premiers caractères
        assert RappelConsoCollector._parse_date("garbage") == "garbage"


# ----------------------------------------------------------------
# Tests HTTP (mock)
# ----------------------------------------------------------------

class TestRappelConsoHTTP:
    """Vérifie que la requête HTTP est correctement formée et que la réponse
    est parsée + paginée correctement."""

    @patch("collectors.rappel_conso.requests.get")
    def test_collect_parses_sample_response(self, mock_get, db_path):
        # Page 1 : 2 résultats < PAGE_LIMIT → fin immédiate de pagination.
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = SAMPLE_PAYLOAD_PAGE_1
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = RappelConsoCollector(db_path, days_back=365)
        articles = collector.collect()

        assert len(articles) == 2
        assert {a["source_id"] for a in articles} == {
            "rappel_conso-2026-04-0331",
            "rappel_conso-2026-04-0332",
        }
        # Vérifie que la requête GET a bien envoyé le filtre catégorie.
        assert mock_get.called
        _, kwargs = mock_get.call_args
        params = kwargs["params"]
        assert params["where"] == 'categorie_produit="alimentation"'
        assert params["order_by"] == "date_publication DESC"
        assert params["limit"] == PAGE_LIMIT

    @patch("collectors.rappel_conso.requests.get")
    def test_collect_empty_response(self, mock_get, db_path):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = SAMPLE_PAYLOAD_EMPTY
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = RappelConsoCollector(db_path)
        articles = collector.collect()
        assert articles == []

    @patch("collectors.rappel_conso.requests.get")
    def test_collect_handles_http_error(self, mock_get, db_path):
        """Quand toutes les tentatives échouent, le collector retourne []."""
        import requests as req
        mock_get.side_effect = req.RequestException("Connection timeout")

        # Patch sleep pour ne pas attendre les RETRY_DELAYS pendant les tests.
        with patch("collectors.rappel_conso.time.sleep"):
            collector = RappelConsoCollector(db_path)
            articles = collector.collect()
        assert articles == []

    @patch("collectors.rappel_conso.requests.get")
    def test_collect_filters_outside_window(self, mock_get, db_path):
        """Un record très ancien ne doit pas être inclus."""
        old_record = {
            **SAMPLE_RECORD,
            "id": 1,
            "numero_fiche": "2020-01-0001",
            "date_publication": "2020-01-15T10:00:00+00:00",
        }
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "total_count": 1,
            "results": [old_record],
        }
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = RappelConsoCollector(db_path, days_back=30)
        articles = collector.collect()
        assert articles == []

    @patch("collectors.rappel_conso.requests.get")
    def test_collect_paginates(self, mock_get, db_path):
        """Si la 1re page est pleine (PAGE_LIMIT records), une 2e requête est faite."""
        full_page = {
            "total_count": PAGE_LIMIT + 1,
            "results": [
                {
                    **SAMPLE_RECORD,
                    "id": i,
                    "numero_fiche": f"2026-04-{i:04d}",
                }
                for i in range(PAGE_LIMIT)
            ],
        }
        last_page = {
            "total_count": PAGE_LIMIT + 1,
            "results": [
                {
                    **SAMPLE_RECORD,
                    "id": 9999,
                    "numero_fiche": "2026-04-9999",
                }
            ],
        }
        mock_response_1 = MagicMock(status_code=200)
        mock_response_1.json.return_value = full_page
        mock_response_2 = MagicMock(status_code=200)
        mock_response_2.json.return_value = last_page
        mock_get.side_effect = [mock_response_1, mock_response_2]

        collector = RappelConsoCollector(db_path, days_back=365)
        articles = collector.collect()

        # 100 + 1 = 101 articles uniques
        assert len(articles) == PAGE_LIMIT + 1
        # 2 appels HTTP (page 1 puis page 2).
        assert mock_get.call_count == 2
        # Vérifie que l'offset a bien été incrémenté à la 2e requête.
        second_call_params = mock_get.call_args_list[1].kwargs["params"]
        assert second_call_params["offset"] == PAGE_LIMIT


# ----------------------------------------------------------------
# Tests intégration DB (run complet save())
# ----------------------------------------------------------------

class TestRappelConsoSave:
    """Vérifie que les articles parsés sont bien insérés en base."""

    @patch("collectors.rappel_conso.requests.get")
    def test_run_inserts_articles(self, mock_get, db_path):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = SAMPLE_PAYLOAD_PAGE_1
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = RappelConsoCollector(db_path, days_back=365)
        stats = collector.run()

        assert stats["source"] == "rappel_conso"
        assert stats["collected"] == 2
        assert stats["inserted"] == 2
        assert stats["errors"] == []

        conn = get_connection(db_path)
        try:
            rows = get_articles(conn, source="rappel_conso")
            assert len(rows) == 2
            row = rows[0]
            assert row["category"] == ARTICLE_CATEGORY
            assert row["status"] == "new"
            assert row["url"].startswith("https://rappel.conso.gouv.fr/")
        finally:
            conn.close()
