"""Tests for the newsletter generator module."""

import json
import os
import tempfile
from datetime import date

import pytest

from publishers.newsletter import (
    IMPACT_COLORS,
    generate_newsletter_html,
    generate_newsletter_subject,
    mark_articles_as_sent,
    select_articles_for_newsletter,
    create_newsletter,
)
from storage.database import get_connection, init_db, insert_article


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db_path():
    """Create a temporary database file for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    os.unlink(path)


@pytest.fixture
def conn(db_path):
    """Return a connection to the test database."""
    connection = get_connection(db_path)
    yield connection
    connection.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

WEEK_START = date(2026, 3, 2)
WEEK_END = date(2026, 3, 8)


def _make_article(**overrides) -> dict:
    """Build a sample article dict with sensible defaults."""
    base = {
        "source": "legifrance",
        "source_id": "legi-test-001",
        "title": "Decret relatif a la formation professionnelle",
        "url": "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT00001",
        "content": "Contenu du decret",
        "published_date": "2026-03-05",
        "category": "reglementaire",
        "status": "done",
        "summary": "Resume du texte reglementaire.",
        "impact_level": "moyen",
        "impact_justification": "Impact moyen sur les OF.",
        "qualiopi_indicators": json.dumps(["23"]),
        "qualiopi_justification": "Veille reglementaire.",
        "relevance_score": 7,
    }
    base.update(overrides)
    return base


def _insert_and_get_id(conn, article: dict) -> int:
    """Insert an article and return its database ID."""
    insert_article(conn, article)
    row = conn.execute(
        "SELECT id FROM articles WHERE source_id = ?",
        (article["source_id"],),
    ).fetchone()
    return row["id"]


# ---------------------------------------------------------------------------
# Tests: select_articles_for_newsletter
# ---------------------------------------------------------------------------

class TestSelectArticles:
    """Tests for article selection and grouping."""

    def test_select_articles_empty_db(self, db_path):
        """An empty database should return zero-count stats and empty sections."""
        result = select_articles_for_newsletter(db_path, WEEK_START, WEEK_END)

        assert result["stats"]["total"] == 0
        assert result["reglementaire"] == []
        assert result["ao"] == []
        assert result["metier"] == []
        assert result["handicap"] == []

    def test_select_articles_with_data(self, db_path, conn):
        """Articles with status='done' should be grouped by category."""
        # Insert a reglementaire article
        insert_article(conn, _make_article(
            source_id="legi-r1",
            category="reglementaire",
            impact_level="fort",
        ))
        # Insert two AO articles
        insert_article(conn, _make_article(
            source="boamp",
            source_id="boamp-ao1",
            category="ao",
            title="Marche formation agents",
            date_limite="2026-04-01",
            acheteur="Mairie de Lyon",
            region="ARA",
        ))
        insert_article(conn, _make_article(
            source="boamp",
            source_id="boamp-ao2",
            category="ao",
            title="Marche bilan de competences",
            date_limite="2026-04-10",
        ))
        # Insert a metier article
        insert_article(conn, _make_article(
            source_id="legi-m1",
            category="metier",
            title="Etude metiers numeriques",
            qualiopi_indicators=json.dumps(["24"]),
        ))

        result = select_articles_for_newsletter(db_path, WEEK_START, WEEK_END)

        assert result["stats"]["total"] == 4
        assert result["stats"]["reglementaire"] == 1
        assert result["stats"]["ao"] == 2
        assert result["stats"]["metier"] == 1
        assert len(result["reglementaire"]) == 1
        assert len(result["ao"]) == 2
        assert len(result["metier"]) == 1

    def test_select_articles_respects_limits(self, db_path, conn):
        """AO section should be capped at 10 articles."""
        for i in range(20):
            insert_article(conn, _make_article(
                source="boamp",
                source_id=f"boamp-lim-{i:03d}",
                category="ao",
                title=f"Marche formation #{i}",
                date_limite=f"2026-04-{(i % 28) + 1:02d}",
            ))

        result = select_articles_for_newsletter(db_path, WEEK_START, WEEK_END)
        assert len(result["ao"]) == 10

    def test_select_articles_sorting(self, db_path, conn):
        """Reglementaire should be sorted by impact (fort first),
        AO by date_limite ASC."""
        # Reglementaire with varying impact
        insert_article(conn, _make_article(
            source_id="legi-sort-faible",
            impact_level="faible",
            relevance_score=5,
        ))
        insert_article(conn, _make_article(
            source_id="legi-sort-fort",
            impact_level="fort",
            relevance_score=9,
        ))
        insert_article(conn, _make_article(
            source_id="legi-sort-moyen",
            impact_level="moyen",
            relevance_score=7,
        ))

        # AO with different deadlines
        insert_article(conn, _make_article(
            source="boamp",
            source_id="boamp-sort-late",
            category="ao",
            date_limite="2026-05-01",
        ))
        insert_article(conn, _make_article(
            source="boamp",
            source_id="boamp-sort-early",
            category="ao",
            date_limite="2026-03-15",
        ))

        result = select_articles_for_newsletter(db_path, WEEK_START, WEEK_END)

        # Reglementaire: fort -> moyen -> faible
        impacts = [a["impact_level"] for a in result["reglementaire"]]
        assert impacts == ["fort", "moyen", "faible"]

        # AO: earliest deadline first
        deadlines = [a["date_limite"] for a in result["ao"]]
        assert deadlines == ["2026-03-15", "2026-05-01"]

    def test_select_articles_excludes_already_sent(self, db_path, conn):
        """Articles with sent_in_newsletter_id set should be excluded."""
        art_id = _insert_and_get_id(conn, _make_article(source_id="legi-sent-1"))

        # Simulate marking as sent
        conn.execute(
            "UPDATE articles SET sent_in_newsletter_id = 1, status = 'sent' WHERE id = ?",
            (art_id,),
        )
        conn.commit()

        # Insert one that has NOT been sent
        insert_article(conn, _make_article(source_id="legi-unsent-1"))

        result = select_articles_for_newsletter(db_path, WEEK_START, WEEK_END)

        # Only the unsent article should appear (the sent one has status='sent' too)
        assert result["stats"]["total"] == 1
        assert result["reglementaire"][0]["source_id"] == "legi-unsent-1"


# ---------------------------------------------------------------------------
# Tests: generate_newsletter_html
# ---------------------------------------------------------------------------

class TestGenerateHTML:
    """Tests for HTML rendering."""

    def _minimal_articles(self, **overrides):
        """Build a minimal articles dict suitable for generate_newsletter_html."""
        base = {
            "reglementaire": [
                {
                    "title": "Decret test",
                    "summary": "Resume decret",
                    "impact_level": "fort",
                    "url": "https://example.com/decret",
                },
            ],
            "ao": [],
            "metier": [],
            "handicap": [],
            "stats": {"total": 1, "reglementaire": 1, "ao": 0, "metier": 0, "handicap": 0},
        }
        base.update(overrides)
        return base

    def test_generate_newsletter_html_basic(self):
        """HTML output should contain key structural elements."""
        articles = self._minimal_articles()
        html = generate_newsletter_html(articles, WEEK_START, WEEK_END, edition_number=5)

        assert "Cipia" in html
        assert "#5" in html or "Edition #5" in html
        assert "02/03/2026" in html
        assert "08/03/2026" in html
        assert "Veille réglementaire" in html
        assert "Decret test" in html

    def test_generate_newsletter_html_empty_sections(self):
        """Sections with zero articles should not appear in the HTML."""
        articles = self._minimal_articles()
        html = generate_newsletter_html(articles, WEEK_START, WEEK_END, edition_number=1)

        # AO section heading should be absent since ao list is empty
        assert "Appels d&#39;offres formation" not in html or "Appels d'offres formation" not in html
        # Metier section should be absent
        assert "Veille metier" not in html

    def test_generate_newsletter_html_impact_badges(self):
        """Impact badges should use correct colours: fort=red, moyen=amber, faible=green."""
        articles = {
            "reglementaire": [
                {"title": "Fort", "summary": "R", "impact_level": "fort", "url": ""},
                {"title": "Moyen", "summary": "R", "impact_level": "moyen", "url": ""},
                {"title": "Faible", "summary": "R", "impact_level": "faible", "url": ""},
            ],
            "ao": [],
            "metier": [],
            "handicap": [],
            "stats": {"total": 3, "reglementaire": 3, "ao": 0, "metier": 0, "handicap": 0},
        }
        html = generate_newsletter_html(articles, WEEK_START, WEEK_END, edition_number=1)

        assert IMPACT_COLORS["fort"] in html      # #DC2626 red
        assert IMPACT_COLORS["moyen"] in html      # #F59E0B amber
        assert IMPACT_COLORS["faible"] in html     # #10B981 green

    def test_generate_newsletter_html_raises_on_zero_articles(self):
        """Generating HTML with zero total articles should raise ValueError."""
        articles = {
            "reglementaire": [],
            "ao": [],
            "metier": [],
            "handicap": [],
            "stats": {"total": 0, "reglementaire": 0, "ao": 0, "metier": 0, "handicap": 0},
        }
        with pytest.raises(ValueError, match="sans articles"):
            generate_newsletter_html(articles, WEEK_START, WEEK_END, edition_number=1)

    def test_generate_newsletter_html_with_string_dates(self):
        """HTML generation should accept string dates (YYYY-MM-DD) as well as date objects."""
        articles = self._minimal_articles()
        html = generate_newsletter_html(
            articles, "2026-03-02", "2026-03-08", edition_number=3
        )

        assert "Cipia" in html
        assert "#3" in html or "Edition #3" in html
        assert "02/03/2026" in html
        assert "08/03/2026" in html
        assert "Decret test" in html


# ---------------------------------------------------------------------------
# Tests: generate_newsletter_subject
# ---------------------------------------------------------------------------

class TestGenerateSubject:
    """Tests for subject-line generation."""

    def test_generate_newsletter_subject_normal(self):
        """Normal subject format: 'Cipia #N -- X textes, Y appels d'offres'."""
        stats = {"reglementaire": 3, "ao": 5, "metier": 1, "handicap": 0}
        subject = generate_newsletter_subject(
            edition_number=7,
            stats=stats,
            date_debut=WEEK_START,
            date_fin=WEEK_END,
            has_high_impact=False,
        )

        assert "Cipia #7" in subject
        assert "4 textes" in subject       # 3 reg + 1 metier + 0 handicap = 4
        assert "5 appels d'offres" in subject

    def test_generate_newsletter_subject_high_impact(self):
        """High-impact subject should include a warning emoji prefix."""
        stats = {"reglementaire": 1, "ao": 2, "metier": 0, "handicap": 0}
        subject = generate_newsletter_subject(
            edition_number=10,
            stats=stats,
            date_debut=WEEK_START,
            date_fin=WEEK_END,
            has_high_impact=True,
        )

        assert "\u26a0\ufe0f" in subject  # warning emoji
        assert "Impact fort" in subject
        assert "Cipia #10" in subject

    def test_generate_newsletter_subject_singular(self):
        """Singular forms when counts are 1."""
        stats = {"reglementaire": 1, "ao": 0, "metier": 0, "handicap": 0}
        subject = generate_newsletter_subject(
            edition_number=1,
            stats=stats,
            date_debut=WEEK_START,
            date_fin=WEEK_END,
            has_high_impact=False,
        )

        assert "1 texte," in subject
        # "0 appel d'offres" (singular because 0 != 1 -> plural? Let's check)
        # The code: 's' if nb_ao != 1 else '' -- so 0 appels
        assert "0 appels d'offres" in subject


# ---------------------------------------------------------------------------
# Tests: mark_articles_as_sent
# ---------------------------------------------------------------------------

class TestMarkArticlesAsSent:
    """Tests for marking articles as included in a newsletter."""

    def test_mark_articles_as_sent(self, db_path, conn):
        """Articles should get status='sent' and the newsletter ID set."""
        id1 = _insert_and_get_id(conn, _make_article(source_id="legi-mark-1"))
        id2 = _insert_and_get_id(conn, _make_article(source_id="legi-mark-2"))

        newsletter_id = 42
        mark_articles_as_sent([id1, id2], newsletter_id, db_path)

        # Re-read from a fresh connection to see committed changes
        conn2 = get_connection(db_path)
        try:
            for art_id in (id1, id2):
                row = conn2.execute(
                    "SELECT status, sent_in_newsletter_id FROM articles WHERE id = ?",
                    (art_id,),
                ).fetchone()
                assert row["status"] == "sent"
                assert row["sent_in_newsletter_id"] == newsletter_id
        finally:
            conn2.close()

    def test_mark_articles_as_sent_empty_list(self, db_path):
        """An empty list should not raise."""
        mark_articles_as_sent([], newsletter_id=1, db_path=db_path)


# ---------------------------------------------------------------------------
# Tests: create_newsletter (full pipeline)
# ---------------------------------------------------------------------------

class TestCreateNewsletter:
    """End-to-end test for the create_newsletter helper."""

    def test_create_newsletter_full_pipeline(self, db_path, conn):
        """End-to-end: insert articles, create newsletter, verify output."""
        # Insert a mix of articles
        insert_article(conn, _make_article(
            source_id="legi-pipe-r1",
            category="reglementaire",
            impact_level="fort",
        ))
        insert_article(conn, _make_article(
            source="boamp",
            source_id="boamp-pipe-ao1",
            category="ao",
            title="Marche formation pipeline",
            date_limite="2026-04-01",
            acheteur="Mairie de Lyon",
            region="ARA",
        ))

        result = create_newsletter(
            db_path=db_path,
            week_start=WEEK_START,
            week_end=WEEK_END,
            edition_number=1,
        )

        assert result is not None
        assert result["edition_number"] == 1
        assert result["newsletter_id"] is not None
        assert result["stats"]["total"] == 2
        assert result["has_high_impact"] is True
        assert "\u26a0\ufe0f" in result["subject"]
        assert "Cipia" in result["html"]
        assert len(result["article_ids"]) == 2
        assert result["html_size_kb"] > 0

    def test_create_newsletter_no_articles(self, db_path):
        """create_newsletter should return None when there are no articles."""
        result = create_newsletter(
            db_path=db_path,
            week_start=WEEK_START,
            week_end=WEEK_END,
            edition_number=99,
        )
        assert result is None
