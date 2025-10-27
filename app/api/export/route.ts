import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

const PRODUCTION_BASE_URL = "https://company.openapi.com";
const SANDBOX_BASE_URL = "https://test.company.openapi.com";
const MAX_RESULTS = 1000;
const DEFAULT_LIMIT = 100;

const HEADERS = [
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
];

type OpenapiRecord = Record<string, unknown>;

function normalizeAteco(code: unknown): string {
  const sanitized = String(code ?? "").replace(/[^0-9]/g, "");
  if (!sanitized) {
    throw new Error("Codice ATECO non valido.");
  }
  return sanitized;
}

function normalizeProvince(code: unknown): string {
  const value = String(code ?? "").trim().toUpperCase();
  if (value.length !== 2) {
    throw new Error("La provincia deve contenere esattamente due caratteri.");
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

async function fetchCompanies(
  token: string,
  atecoCode: string,
  province: string,
  limit: number,
  maxResults: number,
  sandbox: boolean,
): Promise<OpenapiRecord[]> {
  const baseUrl = sandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
  let skip = 0;
  const collected: OpenapiRecord[] = [];

  while (collected.length < maxResults) {
    const remaining = maxResults - collected.length;
    const batchLimit = Math.min(limit, remaining);
    const url = new URL("/IT-search", baseUrl);
    url.searchParams.set("atecoCode", atecoCode);
    url.searchParams.set("province", province);
    url.searchParams.set("limit", String(batchLimit));
    url.searchParams.set("skip", String(skip));
    url.searchParams.set("dataEnrichment", "advanced");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok || payload.success === false) {
      const message = typeof payload.message === "string" && payload.message
        ? payload.message
        : `Errore Openapi (status ${response.status})`;
      throw new Error(message);
    }

    const data = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray((payload.data as Record<string, unknown>)?.data)
        ? ((payload.data as Record<string, unknown>)?.data as OpenapiRecord[])
        : [];

    const validBatch = data.filter((item): item is OpenapiRecord => item && typeof item === "object");
    collected.push(...validBatch);
    skip += validBatch.length;

    if (validBatch.length < batchLimit) {
      break;
    }
  }

  return collected.slice(0, maxResults);
}

function getValue(record: Record<string, unknown>, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (typeof acc !== "object" || acc === null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, record);
}

function composeAddress(address: Record<string, unknown> | undefined): string | undefined {
  if (!address || typeof address !== "object") return undefined;
  const parts: string[] = [];
  const toponym = address["toponym"] as string | undefined;
  const street = (address["street"] || address["streetName"]) as string | undefined;
  const number = address["streetNumber"] as string | undefined;
  if (toponym) parts.push(toponym.toString());
  if (street) parts.push(street.toString());
  if (number) parts.push(number.toString());
  return parts.length ? parts.join(" ") : undefined;
}

function flattenRecord(record: OpenapiRecord): Record<string, unknown> {
  const companyDetails = (record["companyDetails"] as Record<string, unknown>) ?? {};
  const address = (record["address"] as Record<string, unknown>) ?? {};
  const registeredOffice = (address["registeredOffice"] as Record<string, unknown>) ?? {};
  const ateco = ((record["atecoClassification"] as Record<string, unknown>)?.ateco ?? {}) as Record<string, unknown>;
  const international = (record["internationalClassification"] as Record<string, unknown>) ?? {};
  const ecofin = (record["ecofin"] as Record<string, unknown>) ?? {};
  const employees = (record["employees"] as Record<string, unknown>) ?? {};
  const contacts = (record["contacts"] as Record<string, unknown>) ?? {};

  const lastUpdateRaw = (companyDetails["lastUpdateDate"] || record["lastUpdateDate"]) as string | undefined;
  let lastUpdate = lastUpdateRaw;
  if (lastUpdateRaw) {
    const formatted = new Date(lastUpdateRaw).toISOString();
    if (!Number.isNaN(Date.parse(formatted))) {
      lastUpdate = formatted.replace("T", " ").replace(".000Z", " UTC");
    }
  }

  return {
    id: record["id"] ?? companyDetails["openapiNumber"],
    company_name: companyDetails["companyName"] ?? record["companyName"],
    vat_code: companyDetails["vatCode"] ?? record["vatCode"],
    tax_code: companyDetails["taxCode"] ?? record["taxCode"],
    ateco_code: ateco["code"] ?? record["atecoCode"],
    ateco_description: ateco["description"],
    ateco_secondary: getValue(record, ["atecoClassification", "secondaryAteco"]),
    province:
      (registeredOffice["province"] && typeof registeredOffice["province"] === "object"
        ? (registeredOffice["province"] as Record<string, unknown>)["code"]
        : registeredOffice["province"]) ?? undefined,
    town: registeredOffice["town"] ?? address["town"],
    zip_code: registeredOffice["zipCode"] ?? address["zipCode"],
    address: composeAddress(registeredOffice) ?? (address["streetName"] as string | undefined),
    phone: contacts["telephoneNumber"],
    fax: contacts["fax"],
    email: getValue(record, ["mail", "email"]),
    pec: getValue(record, ["pec", "pec"]),
    website: getValue(record, ["webAndSocial", "website"]),
    linkedin: getValue(record, ["webAndSocial", "linkedin"]),
    facebook: getValue(record, ["webAndSocial", "facebook"]),
    turnover: ecofin["turnover"],
    turnover_year: ecofin["turnoverYear"],
    turnover_range: getValue(ecofin, ["turnoverRange", "description"] as string[]),
    share_capital: ecofin["shareCapital"],
    net_worth: ecofin["netWorth"],
    employees: employees["employee"],
    employees_range: getValue(employees, ["employeeRange", "description"] as string[]),
    employees_trend: employees["employeeTrend"],
    enterprise_size: getValue(ecofin, ["enterpriseSize", "description"] as string[]),
    nace_code: getValue(international, ["nace", "code"] as string[]),
    nace_description: getValue(international, ["nace", "description"] as string[]),
    primary_sic: getValue(international, ["primarySic", "code"] as string[]),
    primary_sic_description: getValue(international, ["primarySic", "description"] as string[]),
    last_update: lastUpdate,
  };
}

async function buildWorkbook(
  rows: Record<string, unknown>[],
  metadata: Record<string, unknown>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("Summary");
  summary.addRow(["Generated at", new Date().toISOString()]);
  Object.entries(metadata).forEach(([key, value]) => {
    summary.addRow([key, value]);
  });
  summary.columns = [
    { header: "Field", key: "field", width: 30 },
    { header: "Value", key: "value", width: 40 },
  ];

  const sheet = workbook.addWorksheet("Companies");
  sheet.columns = HEADERS.map((header) => ({ header, key: header, width: 24 }));
  rows.forEach((row) => {
    sheet.addRow(row);
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // Auto-fit within reasonable bounds.
  sheet.columns?.forEach((column) => {
    if (!column) return;
    let maxLength = column.header ? String(column.header).length : 10;
    if (typeof column.eachCell === "function") {
      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value ? String(cell.value) : "";
        maxLength = Math.max(maxLength, value.length);
      });
    }
    column.width = Math.min(Math.max(12, maxLength + 2), 60);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Il token è obbligatorio." },
        { status: 400 },
      );
    }

    const atecoCode = normalizeAteco(body.atecoCode ?? body.ateco);
    const province = normalizeProvince(body.province ?? body.provincia);
    const limit = clamp(Number(body.limit ?? DEFAULT_LIMIT), 1, MAX_RESULTS);
    const maxResults = clamp(Number(body.maxResults ?? body.max_results ?? 500), 1, MAX_RESULTS);
    const sandbox = Boolean(body.sandbox);

    const records = await fetchCompanies(token, atecoCode, province, limit, maxResults, sandbox);
    if (!records.length) {
      return NextResponse.json({ success: true, total: 0, message: "Nessun risultato trovato." });
    }

    const rows = records.map(flattenRecord);
    const metadata = {
      total_records: rows.length,
      ateco_code: atecoCode,
      province,
      sandbox,
      source: "/IT-search",
    };

    const buffer = await buildWorkbook(rows, metadata);
    const fileName = `openapi_companies_${province}_${atecoCode}.xlsx`;

    return NextResponse.json({
      success: true,
      total: rows.length,
      fileName,
      fileContentBase64: buffer.toString("base64"),
      metadata,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore imprevisto.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
