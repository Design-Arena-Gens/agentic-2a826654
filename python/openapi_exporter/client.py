from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List, Optional

import requests

from .utils import clamp_limit, normalize_ateco_code


DEFAULT_TIMEOUT = 30
PRODUCTION_BASE_URL = "https://company.openapi.com"
SANDBOX_BASE_URL = "https://test.company.openapi.com"


class OpenAPIError(RuntimeError):
    """Represents an error returned by the Openapi platform."""


@dataclass
class SearchParams:
    ateco_code: str
    province: str
    limit: int = 100
    max_results: int = 1000
    sandbox: bool = False


class OpenAPIClient:
    """Thin client for Openapi `/IT-search` endpoint."""

    def __init__(self, token: str, sandbox: bool = False, timeout: int = DEFAULT_TIMEOUT):
        self.token = token
        self.base_url = SANDBOX_BASE_URL if sandbox else PRODUCTION_BASE_URL
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
        })

    def _request(self, params: Dict[str, object]) -> Dict[str, object]:
        url = f"{self.base_url}/IT-search"
        response = self.session.get(url, params=params, timeout=self.timeout)
        try:
            payload = response.json()
        except ValueError as exc:  # pragma: no cover - network failure
            raise OpenAPIError(f"Risposta non valida da Openapi (status {response.status_code}).") from exc

        if not response.ok:
            message = payload.get("message") if isinstance(payload, dict) else response.text
            raise OpenAPIError(message or f"Errore HTTP {response.status_code}")

        if not isinstance(payload, dict):
            raise OpenAPIError("Formato di risposta inatteso.")

        if not payload.get("success", False):
            raise OpenAPIError(payload.get("message") or "Richiesta Openapi non riuscita.")

        return payload

    def fetch_companies(
        self,
        ateco_code: str,
        province: str,
        limit: int = 100,
        max_results: int = 1000,
        progress_callback: Optional[Callable[[int], None]] = None,
    ) -> List[Dict[str, object]]:
        """Fetch companies matching filters with automatic pagination."""

        normalized_ateco = normalize_ateco_code(ateco_code)
        province_code = (province or "").strip().upper()
        if len(province_code) != 2:
            raise ValueError("La provincia deve essere composta da 2 caratteri.")

        per_page = clamp_limit(limit)
        max_results = clamp_limit(max_results, maximum=1000)

        accumulated: List[Dict[str, object]] = []
        skip = 0

        while len(accumulated) < max_results:
            remaining = max_results - len(accumulated)
            batch_limit = clamp_limit(min(per_page, remaining))
            params: Dict[str, object] = {
                "atecoCode": normalized_ateco,
                "province": province_code,
                "limit": batch_limit,
                "skip": skip,
                "dataEnrichment": "advanced",
            }

            payload = self._request(params)
            data = payload.get("data")
            if isinstance(data, dict) and "data" in data:
                # alcuni scenari restituiscono un oggetto con ulteriori metadati
                data = data.get("data")

            if not isinstance(data, Iterable):
                data = []

            batch: List[Dict[str, object]] = [
                item for item in data if isinstance(item, dict)
            ]

            if not batch:
                break

            accumulated.extend(batch)
            skip += len(batch)

            if progress_callback:
                progress_callback(len(accumulated))

            if len(batch) < batch_limit:
                # Nessun altro record disponibile.
                break

        return accumulated


def fetch_companies(
    token: str,
    ateco_code: str,
    province: str,
    *,
    limit: int = 100,
    max_results: int = 1000,
    sandbox: bool = False,
    progress_callback: Optional[Callable[[int], None]] = None,
) -> List[Dict[str, object]]:
    """Convenience wrapper for one-off fetches."""

    client = OpenAPIClient(token=token, sandbox=sandbox)
    return client.fetch_companies(
        ateco_code=ateco_code,
        province=province,
        limit=limit,
        max_results=max_results,
        progress_callback=progress_callback,
    )
