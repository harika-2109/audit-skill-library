"""Tests for the wizard scaffold endpoint."""
from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.skill import SkillScaffoldResponse

client = TestClient(app)


def _full_intake() -> dict:
    """A complete, valid intake payload — used in multiple tests."""
    return {
        "summary": "Review a sample of vendor SOC 2 reports and identify control coverage gaps.",
        "category": "regulatory",
        "trigger": "Use when the audit team reviews third-party SOC 2 reports during vendor risk reviews, or assesses outsourced control coverage.",
        "inputs": "1. Vendor name; 2. SOC 2 report PDF; 3. List of controls the vendor is expected to cover; 4. Period of reliance.",
        "connectors": "Vendor risk register, GRC system, evidence repository.",
        "output": "A workpaper with: control coverage matrix, gaps, severity rating, and recommended compensating controls.",
        "standards": "AICPA SSAE 18, COSO 2013, firm Third-Party Risk policy.",
        "sla_minutes": 90,
        "suggested_name": "vendor-soc2-review",
    }


def test_scaffold_endpoint_happy_path():
    """End-to-end shape test — verifies the scaffold endpoint contract.
    Claude SDK is mocked so this runs without API credentials."""
    mock_response = SkillScaffoldResponse(
        name="vendor-soc2-review",
        description="Review a vendor's SOC 2 Type 2 report and identify control coverage gaps. Use when assessing third-party control reliance during vendor risk reviews. Produces a workpaper with coverage matrix and gap recommendations.",
        argument_hint="<vendor_name> [reliance_period]",
        body="# /vendor-soc2-review\n\n> Connectors needed: vendor risk register, GRC system, evidence repository.\n\nReview a vendor's SOC 2 Type 2 report end-to-end and produce a control coverage matrix.\n\n## Trigger\nAuditor invokes when reviewing a vendor SOC 2 during a third-party risk assessment.\n\n## Inputs\n1. Vendor name\n2. SOC 2 report PDF\n3. Period of reliance\n\n## Process\n### 1. Scope review\nIdentify the trust service criteria covered.\n\n## Output\n```\nworkpaper structure here\n```\n\n## Evals\nEvaluated against `evals/vendor-soc2-review/` — 6 historical reviews.\n\n## Citations\n- AICPA SSAE 18\n- COSO 2013",
        notes=[
            "Confirm SSAE 18 vs ISAE 3402 applicability for international vendors",
            "Trust service criteria list is a placeholder — verify against current AICPA framework",
        ],
    )
    with patch(
        "app.services.skill_scaffold.scaffold_skill",
        return_value=mock_response,
    ):
        r = client.post("/api/scaffold", json=_full_intake())
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "vendor-soc2-review"
    assert "## Process" in data["body"]
    assert len(data["notes"]) >= 2


def test_scaffold_rejects_short_summary():
    payload = _full_intake()
    payload["summary"] = "too short"  # min_length=10
    r = client.post("/api/scaffold", json=payload)
    assert r.status_code == 422


def test_scaffold_rejects_invalid_category():
    """Confirms the wizard cannot bypass audit-only enforcement."""
    payload = _full_intake()
    payload["category"] = "backend"
    r = client.post("/api/scaffold", json=payload)
    assert r.status_code == 422


def test_scaffold_accepts_minimum_required_fields():
    """connectors, standards, sla_minutes, suggested_name are all optional."""
    minimal = {
        "summary": "Minimal payload to test optional field handling in the wizard intake.",
        "category": "testing",
        "trigger": "When the auditor needs to run this minimal scaffold workflow.",
        "inputs": "1. Some input parameter required by the skill itself.",
        "output": "A short output paragraph produced by the skill at completion.",
    }
    mock_response = SkillScaffoldResponse(
        name="minimal-skill",
        description="A minimal skill draft used for verifying that optional intake fields are tolerated correctly by the scaffold endpoint.",
        argument_hint=None,
        body="# /minimal-skill\n\nMinimal body content with enough characters.\n\n## Trigger\nWhen invoked.\n\n## Process\n### 1. Do the thing\nProcedure goes here.\n\n## Output\nResult here.",
        notes=["No connectors specified — verify the skill doesn't need any"],
    )
    with patch(
        "app.services.skill_scaffold.scaffold_skill",
        return_value=mock_response,
    ):
        r = client.post("/api/scaffold", json=minimal)
    assert r.status_code == 200
    assert r.json()["name"] == "minimal-skill"


def test_scaffold_no_domain_field_in_request():
    """Confirms there is no longer a 'domain' field — audit-only build."""
    payload = _full_intake()
    payload["domain"] = "tech"  # extra field — pydantic ignores by default
    mock_response = SkillScaffoldResponse(
        name="ignore-domain-field",
        description="Test skill confirming that any 'domain' field in the intake payload is silently dropped by the schema validator.",
        argument_hint=None,
        body="# /ignore-domain-field\n\nMinimal body with enough content to be valid for the test.\n\n## Trigger\nFor testing.\n\n## Process\n### 1. Do nothing\nNo-op.\n\n## Output\nNothing.",
        notes=["Domain field was ignored as expected"],
    )
    with patch(
        "app.services.skill_scaffold.scaffold_skill",
        return_value=mock_response,
    ):
        r = client.post("/api/scaffold", json=payload)
    # Should succeed — extra field ignored, no domain coupling anywhere
    assert r.status_code == 200
