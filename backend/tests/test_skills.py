"""Tests for the audit skills API."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_list_skills_returns_the_8_audit_skills():
    r = client.get("/api/skills")
    assert r.status_code == 200
    skills = r.json()
    names = {s["name"] for s in skills}
    expected = {
        "sox-control-testing",
        "risk-assessment",
        "rcm-walkthrough",
        "evidence-sampling",
        "issue-writeup",
        "regulatory-mapping",
        "audit-planning",
        "continuous-controls-monitoring",
    }
    assert expected.issubset(names), f"Missing: {expected - names}"


def test_categories_meta_endpoint():
    r = client.get("/api/skills/_meta/categories")
    assert r.status_code == 200
    cats = r.json()
    assert cats == [
        "planning", "documentation", "sox", "testing",
        "reporting", "regulatory", "monitoring",
    ]


def test_get_specific_skill():
    r = client.get("/api/skills/sox-control-testing")
    assert r.status_code == 200
    s = r.json()
    assert s["name"] == "sox-control-testing"
    assert s["category"] == "sox"
    assert s["status"] == "published"
    assert "PCAOB AS 2201" in s["body"]


def test_filter_by_category():
    r = client.get("/api/skills?category=sox")
    assert r.status_code == 200
    skills = r.json()
    assert all(s["category"] == "sox" for s in skills)
    assert len(skills) >= 1


def test_search_filter():
    r = client.get("/api/skills?q=sampling")
    assert r.status_code == 200
    skills = r.json()
    assert any(
        "sampling" in s["name"] or "sampling" in s["description"].lower()
        for s in skills
    )


def test_create_skill_minimal():
    payload = {
        "name": "test-skill-tmp",
        "description": "A temporary skill created during testing to validate the create endpoint works correctly.",
        "category": "testing",
        "body": "# /test-skill-tmp\n\nThis is a test skill body with enough content to pass validation.",
    }
    r = client.post("/api/skills", json=payload)
    assert r.status_code == 201
    s = r.json()
    assert s["name"] == "test-skill-tmp"
    assert s["status"] == "draft"
    assert s["category"] == "testing"
    client.delete("/api/skills/test-skill-tmp")


def test_create_skill_with_sla():
    payload = {
        "name": "sla-test-skill",
        "description": "Test skill with an SLA value attached to validate that field flows through.",
        "category": "monitoring",
        "body": "# /sla-test-skill\n\nBody content here for the SLA test case.",
        "sla_minutes": 30,
    }
    r = client.post("/api/skills", json=payload)
    assert r.status_code == 201
    assert r.json()["sla_minutes"] == 30
    client.delete("/api/skills/sla-test-skill")


def test_create_skill_rejects_duplicate():
    payload = {
        "name": "sox-control-testing",
        "description": "Duplicate of existing skill — should fail with 409.",
        "category": "sox",
        "body": "Some body content here for the duplicate test case.",
    }
    r = client.post("/api/skills", json=payload)
    assert r.status_code == 409


def test_create_skill_rejects_invalid_category():
    """Tech/ops categories should no longer be valid in this audit-only build."""
    payload = {
        "name": "should-not-exist",
        "description": "Tech category attempt — should be rejected because we only support audit.",
        "category": "backend",  # was a tech category in the prior multi-domain build
        "body": "Body content here just for completeness.",
    }
    r = client.post("/api/skills", json=payload)
    assert r.status_code == 422  # pydantic validation error


def test_get_nonexistent_skill_returns_404():
    r = client.get("/api/skills/does-not-exist")
    assert r.status_code == 404
