from __future__ import annotations

import os
import re
from typing import Optional


ATECO_SANITIZE_PATTERN = re.compile(r"[^0-9]")


def normalize_ateco_code(code: str) -> str:
    """Sanitize ATECO code by removing non-digit characters.

    The Openapi endpoint accepts numeric strings such as "1071". Users might
    provide variants like "10.71"; this helper normalizes them.
    """

    digits = ATECO_SANITIZE_PATTERN.sub("", code or "")
    if not digits:
        raise ValueError("Codice ATECO non valido oppure vuoto.")
    return digits


def get_token(token: Optional[str] = None) -> str:
    """Resolve the Openapi token from argument or environment variable."""

    candidate = (token or os.getenv("OPENAPI_TOKEN") or "").strip()
    if not candidate:
        raise ValueError(
            "È necessario fornire un token Openapi tramite parametro oppure impostando la variabile di ambiente OPENAPI_TOKEN."
        )
    return candidate


def clamp_limit(value: int, minimum: int = 1, maximum: int = 1000) -> int:
    """Ensure per-request limit respects API boundaries."""

    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value
