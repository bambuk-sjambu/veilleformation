"""Tests for the Brevo email client module."""

import os
from unittest.mock import MagicMock, patch

import pytest

from publishers.brevo import BrevoClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """Return a BrevoClient with a test API key."""
    with patch.dict(os.environ, {"BREVO_API_KEY": "", "BREVO_LIST_ID": "3"}, clear=False):
        c = BrevoClient(api_key="test-api-key-123")
    # Disable rate-limiter delays in tests
    c._rate_limiter._max = 99999
    return c


@pytest.fixture
def client_no_key():
    """Return a BrevoClient without an API key."""
    with patch.dict(os.environ, {"BREVO_API_KEY": ""}, clear=False):
        return BrevoClient(api_key="")


def _mock_response(status_code=200, json_data=None):
    """Create a mock httpx.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    resp.text = ""
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# Tests: initialization
# ---------------------------------------------------------------------------

class TestInit:
    """Tests for BrevoClient initialization."""

    def test_init_without_api_key(self, client_no_key):
        """Client should initialize gracefully without an API key."""
        assert client_no_key.api_key == ""
        # Internal headers should still be set (just with empty key)
        assert "api-key" in client_no_key._headers

    def test_init_with_api_key(self, client):
        """Client should store the API key and set headers correctly."""
        assert client.api_key == "test-api-key-123"
        assert client._headers["api-key"] == "test-api-key-123"
        assert client._headers["Content-Type"] == "application/json"
        assert client._headers["Accept"] == "application/json"


# ---------------------------------------------------------------------------
# Tests: subscriber management
# ---------------------------------------------------------------------------

class TestAddSubscriber:
    """Tests for add_subscriber."""

    @patch("publishers.brevo.httpx.request")
    def test_add_subscriber_success(self, mock_request, client):
        """Successful POST /contacts should return True."""
        mock_request.return_value = _mock_response(201, {"id": 42})

        result = client.add_subscriber(
            email="user@example.com",
            first_name="Jean",
            company_name="OF Test",
        )

        assert result is True
        mock_request.assert_called_once()

        call_kwargs = mock_request.call_args
        assert call_kwargs.args[0] == "POST"
        assert "/contacts" in call_kwargs.args[1]

        body = call_kwargs.kwargs["json"]
        assert body["email"] == "user@example.com"
        assert body["attributes"]["PRENOM"] == "Jean"
        assert body["attributes"]["ENTREPRISE"] == "OF Test"
        assert client.list_id in body["listIds"]

    @patch("publishers.brevo.httpx.request")
    def test_add_subscriber_failure(self, mock_request, client):
        """HTTP error on add_subscriber should return False."""
        import httpx
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = '{"message": "Invalid email"}'
        exc = httpx.HTTPStatusError(
            message="Bad Request", request=MagicMock(), response=mock_response
        )
        mock_response.raise_for_status.side_effect = exc
        mock_request.return_value = mock_response

        result = client.add_subscriber(email="bad-email")
        assert result is False

    def test_add_subscriber_no_api_key(self, client_no_key):
        """Without API key, add_subscriber should return False without calling API."""
        result = client_no_key.add_subscriber(email="test@example.com")
        assert result is False


# ---------------------------------------------------------------------------
# Tests: remove_subscriber
# ---------------------------------------------------------------------------

class TestRemoveSubscriber:
    """Tests for remove_subscriber."""

    @patch("publishers.brevo.httpx.request")
    def test_remove_subscriber(self, mock_request, client):
        """Successful removal should return True."""
        mock_request.return_value = _mock_response(200)

        result = client.remove_subscriber("user@example.com")

        assert result is True
        call_kwargs = mock_request.call_args
        assert "/contacts/lists/" in call_kwargs.args[1]
        assert "/contacts/remove" in call_kwargs.args[1]
        assert call_kwargs.kwargs["json"]["emails"] == ["user@example.com"]


# ---------------------------------------------------------------------------
# Tests: get_subscriber_count
# ---------------------------------------------------------------------------

class TestGetSubscriberCount:
    """Tests for get_subscriber_count."""

    @patch("publishers.brevo.httpx.request")
    def test_get_subscriber_count(self, mock_request, client):
        """Should extract subscribersCount from the API response."""
        mock_request.return_value = _mock_response(
            200, {"subscribersCount": 42, "name": "VeilleFormation"}
        )

        count = client.get_subscriber_count()

        assert count == 42
        call_kwargs = mock_request.call_args
        assert call_kwargs.args[0] == "GET"
        assert f"/contacts/lists/{client.list_id}" in call_kwargs.args[1]

    @patch("publishers.brevo.httpx.request")
    def test_get_subscriber_count_error(self, mock_request, client):
        """On error, should return 0."""
        import httpx
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Server error"
        exc = httpx.HTTPStatusError(
            message="Internal Server Error", request=MagicMock(), response=mock_response
        )
        mock_response.raise_for_status.side_effect = exc
        mock_request.return_value = mock_response

        count = client.get_subscriber_count()
        assert count == 0


# ---------------------------------------------------------------------------
# Tests: create_and_send_campaign
# ---------------------------------------------------------------------------

class TestCreateAndSendCampaign:
    """Tests for campaign creation and sending."""

    @patch("publishers.brevo.httpx.request")
    def test_create_and_send_campaign(self, mock_request, client):
        """Should POST /emailCampaigns then POST /sendNow."""
        # First call: create campaign, second call: send now
        create_resp = _mock_response(201, {"id": 101})
        send_resp = _mock_response(204)
        mock_request.side_effect = [create_resp, send_resp]

        campaign_id = client.create_and_send_campaign(
            html_content="<h1>Newsletter</h1>",
            subject="VeilleFormation #1",
        )

        assert campaign_id == 101
        assert mock_request.call_count == 2

        # Verify create call
        create_call = mock_request.call_args_list[0]
        assert create_call.args[0] == "POST"
        assert "/emailCampaigns" in create_call.args[1]
        body = create_call.kwargs["json"]
        assert body["subject"] == "VeilleFormation #1"
        assert body["htmlContent"] == "<h1>Newsletter</h1>"

        # Verify send call
        send_call = mock_request.call_args_list[1]
        assert send_call.args[0] == "POST"
        assert "/emailCampaigns/101/sendNow" in send_call.args[1]

    @patch("publishers.brevo.httpx.request")
    def test_create_campaign_failure(self, mock_request, client):
        """If campaign creation fails, should return None."""
        import httpx
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Bad request"
        exc = httpx.HTTPStatusError(
            message="Bad Request", request=MagicMock(), response=mock_response
        )
        mock_response.raise_for_status.side_effect = exc
        mock_request.return_value = mock_response

        result = client.create_and_send_campaign(
            html_content="<p>Test</p>",
            subject="Test",
        )
        assert result is None


# ---------------------------------------------------------------------------
# Tests: get_campaign_stats
# ---------------------------------------------------------------------------

class TestGetCampaignStats:
    """Tests for campaign statistics retrieval."""

    @patch("publishers.brevo.httpx.request")
    def test_get_campaign_stats(self, mock_request, client):
        """Should parse and return structured stats from Brevo response."""
        api_data = {
            "recipients": {"recipientsCount": 500},
            "statistics": {
                "globalStats": {
                    "delivered": 480,
                    "uniqueOpens": 192,
                    "uniqueClicks": 48,
                    "unsubscribed": 3,
                    "hardBounces": 5,
                    "softBounces": 15,
                },
            },
        }
        mock_request.return_value = _mock_response(200, api_data)

        stats = client.get_campaign_stats(campaign_id=101)

        assert stats is not None
        assert stats["recipients"] == 500
        assert stats["delivered"] == 480
        assert stats["opens"] == 192
        assert stats["clicks"] == 48
        assert stats["unsubscribes"] == 3
        assert stats["bounces"] == 20  # 5 hard + 15 soft
        assert stats["open_rate"] == pytest.approx(40.0, abs=0.1)
        assert stats["click_rate"] == pytest.approx(10.0, abs=0.1)


# ---------------------------------------------------------------------------
# Tests: send_transactional_email
# ---------------------------------------------------------------------------

class TestSendTransactionalEmail:
    """Tests for transactional email sending."""

    @patch("publishers.brevo.httpx.request")
    def test_send_transactional_email(self, mock_request, client):
        """Successful send should return True."""
        mock_request.return_value = _mock_response(201, {"messageId": "abc123"})

        result = client.send_transactional_email(
            to_email="admin@example.com",
            subject="Alerte monitoring",
            html_content="<p>Alerte</p>",
        )

        assert result is True
        call_kwargs = mock_request.call_args
        assert call_kwargs.args[0] == "POST"
        assert "/smtp/email" in call_kwargs.args[1]

        body = call_kwargs.kwargs["json"]
        assert body["to"] == [{"email": "admin@example.com"}]
        assert body["subject"] == "Alerte monitoring"
        assert body["htmlContent"] == "<p>Alerte</p>"

    @patch("publishers.brevo.httpx.request")
    def test_send_transactional_email_failure(self, mock_request, client):
        """Failed send should return False."""
        import httpx
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Bad request"
        exc = httpx.HTTPStatusError(
            message="Bad Request", request=MagicMock(), response=mock_response
        )
        mock_response.raise_for_status.side_effect = exc
        mock_request.return_value = mock_response

        result = client.send_transactional_email(
            to_email="bad",
            subject="Test",
            html_content="<p>Test</p>",
        )
        assert result is False
