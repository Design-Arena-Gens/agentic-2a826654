from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Iterable, List, OrderedDict


def _safe_get(data: Dict[str, Any], *path: str, default: Any = None) -> Any:
    current: Any = data
    for key in path:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
    return current if current is not None else default


def flatten_company(record: Dict[str, Any]) -> Dict[str, Any]:
    """Extract a curated subset of fields from the Openapi payload."""

    company_details = record.get("companyDetails") or {}
    address = record.get("address") or {}
    registered_office = address.get("registeredOffice") or {}
    ateco = (record.get("atecoClassification") or {}).get("ateco") or {}
    international = record.get("internationalClassification") or {}
    ecofin = record.get("ecofin") or {}
    employees = record.get("employees") or {}
    contacts = record.get("contacts") or {}

    result: Dict[str, Any] = {
        "id": record.get("id") or company_details.get("openapiNumber"),
        "company_name": company_details.get("companyName") or record.get("companyName"),
        "vat_code": company_details.get("vatCode") or record.get("vatCode"),
        "tax_code": company_details.get("taxCode") or record.get("taxCode"),
        "ateco_code": ateco.get("code") or record.get("atecoCode"),
        "ateco_description": ateco.get("description"),
        "ateco_secondary": _safe_get(record, "atecoClassification", "secondaryAteco"),
        "province": _safe_get(registered_office, "province", "code") or registered_office.get("province"),
        "town": registered_office.get("town") or _safe_get(address, "town"),
        "zip_code": registered_office.get("zipCode") or _safe_get(address, "zipCode"),
        "address": _compose_address(registered_office) or _safe_get(address, "streetName"),
        "phone": contacts.get("telephoneNumber"),
        "fax": contacts.get("fax"),
        "email": _safe_get(record, "mail", "email"),
        "pec": _safe_get(record, "pec", "pec"),
        "website": _safe_get(record, "webAndSocial", "website"),
        "linkedin": _safe_get(record, "webAndSocial", "linkedin"),
        "facebook": _safe_get(record, "webAndSocial", "facebook"),
        "turnover": ecofin.get("turnover"),
        "turnover_year": ecofin.get("turnoverYear"),
        "turnover_range": _safe_get(ecofin, "turnoverRange", "description"),
        "share_capital": ecofin.get("shareCapital"),
        "net_worth": ecofin.get("netWorth"),
        "employees": employees.get("employee"),
        "employees_range": _safe_get(employees, "employeeRange", "description"),
        "employees_trend": employees.get("employeeTrend"),
        "enterprise_size": _safe_get(ecofin, "enterpriseSize", "description"),
        "nace_code": _safe_get(international, "nace", "code"),
        "nace_description": _safe_get(international, "nace", "description"),
        "primary_sic": _safe_get(international, "primarySic", "code"),
        "primary_sic_description": _safe_get(international, "primarySic", "description"),
        "last_update": company_details.get("lastUpdateDate") or record.get("lastUpdateDate"),
    }

    # Convert ISO timestamps to human-friendly format when possible.
    if isinstance(result["last_update"], str):
        try:
            parsed = datetime.fromisoformat(result["last_update"].replace("Z", "+00:00"))
            result["last_update"] = parsed.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            pass

    return result


def _compose_address(address: Dict[str, Any]) -> str:
    if not isinstance(address, dict):
        return ""
    parts: List[str] = []
    if address.get("toponym"):
        parts.append(str(address["toponym"]))
    if address.get("street"):
        parts.append(str(address["street"]))
    elif address.get("streetName"):
        parts.append(str(address["streetName"]))
    if address.get("streetNumber"):
        parts.append(str(address["streetNumber"]))
    return " ".join(parts)


def build_rows(records: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [flatten_company(record) for record in records]


HEADERS: List[str] = [
    "id",
    "company_name",
    "vat_code",
    "tax_code",
    "ateco_code",
    "ateco_description",
    "ateco_secondary",
    "province",
    "town",
    "zip_code",
    "address",
    "phone",
    "fax",
    "email",
    "pec",
    "website",
    "linkedin",
    "facebook",
    "turnover",
    "turnover_year",
    "turnover_range",
    "share_capital",
    "net_worth",
    "employees",
    "employees_range",
    "employees_trend",
    "enterprise_size",
    "nace_code",
    "nace_description",
    "primary_sic",
    "primary_sic_description",
    "last_update",
]
