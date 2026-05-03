"""PISTE OAuth2 client-credentials helper.

PISTE (api.piste.gouv.fr) is the unified gateway for several DILA / Cour de
cassation / DGFiP APIs (Légifrance, Judilibre, etc.). All of them share the
same OAuth2 token endpoint with the `client_credentials` grant.

Cipia already uses PISTE for ``collectors/legifrance.py``. To avoid duplicating
the auth logic in ``collectors/judilibre.py`` (and any future PISTE-backed
collector), this module exposes a small reusable :class:`PisteAuth` helper
with a 1h in-memory token cache.

Environment variables (read by :func:`PisteAuth.from_env`)
---------------------------------------------------------
- ``PISTE_CLIENT_ID`` / ``PISTE_CLIENT_SECRET`` (preferred, generic)
- ``LEGIFRANCE_CLIENT_ID`` / ``LEGIFRANCE_CLIENT_SECRET`` (legacy fallback,
  shared OAuth app on PISTE — same credentials for all PISTE APIs).

NOTE on the existing :class:`collectors.legifrance.LegifranceCollector`
---------------------------------------------------------------------
We deliberately do **not** rewire ``legifrance.py`` to use this helper. The
legacy collector already has a working ``_get_token`` method, and its tests
mock ``collectors.legifrance.requests.post`` directly. Switching to
``PisteAuth`` would silently bypass those mocks and break the test suite.

Migration path (out of scope for this task): add a constructor injection
``LegifranceCollector(piste_auth=...)``, switch the tests to mock
``collectors.piste_auth.requests.post``, then delete the inline auth.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Optional

import requests


PISTE_TOKEN_URL = "https://oauth.piste.gouv.fr/api/oauth/token"
DEFAULT_SCOPE = "openid"
DEFAULT_TTL_SECONDS = 3600  # PISTE tokens are typically valid 1h


class PisteAuth:
    """OAuth2 client-credentials helper for any api.piste.gouv.fr endpoint.

    The token is cached in memory for ``ttl_seconds`` (default 1h) and
    refreshed on demand or when a 401 is observed by the caller.

    Usage::

        auth = PisteAuth.from_env(logger=logger)
        if not auth.has_credentials():
            return []  # caller decides graceful fallback
        token = auth.get_token()
        if not token:
            return []
        requests.get(url, headers={"Authorization": f"Bearer {token}"})
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        logger: Optional[logging.Logger] = None,
        scope: str = DEFAULT_SCOPE,
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
        token_url: str = PISTE_TOKEN_URL,
        timeout: int = 15,
    ):
        self.client_id = client_id or ""
        self.client_secret = client_secret or ""
        self.logger = logger or logging.getLogger(self.__class__.__name__)
        self.scope = scope
        self.ttl_seconds = ttl_seconds
        self.token_url = token_url
        self.timeout = timeout

        self._token: Optional[str] = None
        self._expires_at: float = 0.0

    # --------------------------------------------------------------
    # Constructors
    # --------------------------------------------------------------

    @classmethod
    def from_env(
        cls,
        logger: Optional[logging.Logger] = None,
        scope: str = DEFAULT_SCOPE,
    ) -> "PisteAuth":
        """Build a PisteAuth from env vars, with legacy fallback.

        Order of precedence:
        1. ``PISTE_CLIENT_ID`` / ``PISTE_CLIENT_SECRET`` (preferred)
        2. ``LEGIFRANCE_CLIENT_ID`` / ``LEGIFRANCE_CLIENT_SECRET``
           (legacy — Cipia historically used these for the shared PISTE app)
        """
        client_id = (
            os.environ.get("PISTE_CLIENT_ID")
            or os.environ.get("LEGIFRANCE_CLIENT_ID")
            or ""
        )
        client_secret = (
            os.environ.get("PISTE_CLIENT_SECRET")
            or os.environ.get("LEGIFRANCE_CLIENT_SECRET")
            or ""
        )
        return cls(client_id, client_secret, logger=logger, scope=scope)

    # --------------------------------------------------------------
    # Public API
    # --------------------------------------------------------------

    def has_credentials(self) -> bool:
        """True if both client_id and client_secret are set (non-empty)."""
        return bool(self.client_id and self.client_secret)

    def get_token(self, force_refresh: bool = False) -> Optional[str]:
        """Return a valid OAuth2 bearer token.

        Args:
            force_refresh: If True, invalidate the cache and request a new
                token. Use after a 401 from the resource server.

        Returns:
            The access token string, or ``None`` on auth failure (logged at
            ERROR level — caller should treat as a soft failure).
        """
        if not self.has_credentials():
            return None

        now = time.time()
        if (
            not force_refresh
            and self._token
            and now < self._expires_at
        ):
            return self._token

        try:
            response = requests.post(
                self.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": self.scope,
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json() or {}
            token = payload.get("access_token")
            if not token:
                self.logger.error(
                    "PISTE: token endpoint OK mais pas d'access_token (payload=%s)",
                    list(payload.keys()),
                )
                return None

            # Honour expires_in if present, otherwise fall back to ttl_seconds.
            expires_in = payload.get("expires_in")
            try:
                expires_in = int(expires_in) if expires_in else self.ttl_seconds
            except (TypeError, ValueError):
                expires_in = self.ttl_seconds
            # Refresh slightly before real expiry to avoid edge-of-validity 401s.
            self._token = token
            self._expires_at = now + max(60, expires_in - 60)
            self.logger.info("PISTE: token OAuth2 obtenu (ttl=%ss)", expires_in)
            return self._token

        except requests.RequestException as exc:
            self.logger.error("PISTE: erreur authentification: %s", exc)
            return None

    def invalidate(self) -> None:
        """Drop the cached token (e.g. after observing a 401)."""
        self._token = None
        self._expires_at = 0.0
