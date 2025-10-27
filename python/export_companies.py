from __future__ import annotations

import argparse
import sys
from pathlib import Path

from openapi_exporter import (
    OpenAPIError,
    build_rows,
    build_xlsx_bytes,
    fetch_companies,
    get_token,
)


def parse_arguments(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Esporta un elenco di aziende filtrate per codice ATECO e provincia in formato XLSX.",
    )
    parser.add_argument("ateco_code", help="Codice ATECO (es. 1071 o 10.71)")
    parser.add_argument("province", help="Provincia a due lettere, es. VR")
    parser.add_argument(
        "-o",
        "--output",
        default="openapi_companies.xlsx",
        help="Percorso del file di output (default: openapi_companies.xlsx)",
    )
    parser.add_argument(
        "-t",
        "--token",
        default=None,
        help="Token Openapi. In alternativa usare la variabile di ambiente OPENAPI_TOKEN.",
    )
    parser.add_argument(
        "-l",
        "--limit",
        type=int,
        default=100,
        help="Numero massimo di record per richiesta (1-1000).",
    )
    parser.add_argument(
        "-m",
        "--max-results",
        type=int,
        default=500,
        help="Numero massimo di record totali da esportare (1-1000).",
    )
    parser.add_argument(
        "-s",
        "--sandbox",
        action="store_true",
        help="Utilizza l'ambiente sandbox (test.company.openapi.com).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_arguments(argv or sys.argv[1:])

    try:
        token = get_token(args.token)
    except ValueError as exc:
        print(f"Errore: {exc}", file=sys.stderr)
        return 1

    try:
        companies = fetch_companies(
            token=token,
            ateco_code=args.ateco_code,
            province=args.province,
            limit=args.limit,
            max_results=args.max_results,
            sandbox=args.sandbox,
        )
    except (OpenAPIError, ValueError) as exc:
        print(f"Errore durante la chiamata API: {exc}", file=sys.stderr)
        return 2

    if not companies:
        print("Nessuna azienda trovata con i criteri specificati.")
        return 0

    rows = build_rows(companies)
    metadata = {
        "total_records": len(rows),
        "ateco_code": args.ateco_code,
        "province": args.province.upper(),
        "source": "Openapi /IT-search",
        "sandbox": args.sandbox,
    }

    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        output_bytes = build_xlsx_bytes(rows, metadata)
        output_path.write_bytes(output_bytes)
    except OSError as exc:
        print(f"Impossibile scrivere il file di output: {exc}", file=sys.stderr)
        return 3

    print(f"Esportazione completata: {output_path} ({len(rows)} record)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
