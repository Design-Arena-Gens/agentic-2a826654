from openapi_exporter.transform import HEADERS, build_rows, flatten_company


EXAMPLE_COMPANY = {
    "id": "60b4a85585e34e615c569ef5",
    "companyDetails": {
        "companyName": "OPENAPI S.P.A.",
        "vatCode": "12485671007",
        "taxCode": "12485671007",
        "lastUpdateDate": "2023-03-08T11:25:08.0331456Z",
        "openapiNumber": "IT93E20F0DS0001",
    },
    "address": {
        "registeredOffice": {
            "toponym": "VIALE",
            "street": "FILIPPO TOMMASO MARINETTI",
            "streetNumber": "221",
            "town": "ROMA",
            "province": {"code": "RM", "description": "ROMA"},
            "zipCode": "00143",
        }
    },
    "atecoClassification": {
        "ateco": {"code": "6201", "description": "Produzione di software"},
        "secondaryAteco": "6202",
    },
    "internationalClassification": {
        "nace": {"code": "6201", "description": "Attività di programmazione"},
        "primarySic": {"code": "7372", "description": "Software"},
    },
    "ecofin": {
        "turnover": 4432761,
        "turnoverYear": 2021,
        "turnoverRange": {"description": "1000000 - 4999999"},
        "shareCapital": 50000,
        "netWorth": 563473,
        "enterpriseSize": {"description": "Piccola impresa"},
    },
    "employees": {
        "employee": 15,
        "employeeRange": {"description": "11 - 20"},
        "employeeTrend": 7.14,
    },
    "contacts": {"telephoneNumber": "0697276223", "fax": "0687420311"},
    "mail": {"email": "info@altravia.com"},
    "pec": {"pec": "openapi@legalmail.it"},
    "webAndSocial": {
        "website": "www.altravia.com",
        "linkedin": "https://linkedin.com/company/openapi-srl",
    },
}


def test_flatten_company_extracts_expected_fields():
    flattened = flatten_company(EXAMPLE_COMPANY)
    assert flattened["company_name"] == "OPENAPI S.P.A."
    assert flattened["vat_code"] == "12485671007"
    assert flattened["province"] == "RM"
    assert flattened["address"].startswith("VIALE")
    assert flattened["turnover"] == 4432761
    assert flattened["turnover_year"] == 2021
    assert flattened["employees"] == 15
    assert flattened["website"] == "www.altravia.com"


def test_build_rows_preserves_header_keys():
    rows = build_rows([EXAMPLE_COMPANY])
    assert len(rows) == 1
    row = rows[0]
    for header in HEADERS:
        assert header in row
