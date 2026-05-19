"""Filesystem-backed skill storage.

Skills live as markdown files under SKILLS_DIR with YAML frontmatter.
This matches the Anthropic Agent SDK convention, so skills published here are
portable to any MCP/agent runtime without rewriting.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import yaml
from fastapi import HTTPException

from app.core.config import settings
from app.models.skill import (
    Skill,
    SkillCategory,
    SkillCreateRequest,
    SkillStatus,
    SkillSummary,
    SkillUpdateRequest,
)

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)


def _parse_skill_file(path: Path) -> Skill:
    """Parse a SKILL.md style file into a Skill."""
    text = path.read_text(encoding="utf-8")
    match = _FRONTMATTER_RE.match(text)
    if not match:
        raise HTTPException(
            status_code=500,
            detail=f"Skill file {path.name} missing YAML frontmatter",
        )
    fm_text, body = match.group(1), match.group(2)
    fm = yaml.safe_load(fm_text) or {}

    return Skill(
        name=fm["name"],
        description=fm["description"],
        argument_hint=fm.get("argument-hint"),
        owner=fm.get("owner", "internal-audit"),
        category=SkillCategory(fm.get("category", "testing")),
        status=SkillStatus(fm.get("status", "draft")),
        version=str(fm.get("version", "0.1.0")),
        sla_minutes=fm.get("sla_minutes"),
        body=body.strip(),
        updated_at=datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc),
        file_path=str(path),
    )


def _serialize_skill(skill: Skill) -> str:
    """Serialize a Skill back to SKILL.md format."""
    fm = {
        "name": skill.name,
        "description": skill.description,
        "owner": skill.owner,
        "category": skill.category.value,
        "status": skill.status.value,
        "version": skill.version,
    }
    if skill.argument_hint:
        fm["argument-hint"] = skill.argument_hint
    if skill.sla_minutes is not None:
        fm["sla_minutes"] = skill.sla_minutes

    fm_text = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True).strip()
    return f"---\n{fm_text}\n---\n\n{skill.body.strip()}\n"


def _skill_path(name: str) -> Path:
    safe = re.sub(r"[^a-z0-9-]", "", name.lower())
    if safe != name:
        raise HTTPException(status_code=400, detail="Invalid skill name")
    return settings.skills_dir / f"{safe}.md"


def list_skills(
    category: Optional[SkillCategory] = None,
    status: Optional[SkillStatus] = None,
    q: Optional[str] = None,
) -> list[SkillSummary]:
    """List all skills with optional filters."""
    skills = []
    for path in sorted(settings.skills_dir.glob("*.md")):
        try:
            s = _parse_skill_file(path)
        except Exception:
            continue
        if category and s.category != category:
            continue
        if status and s.status != status:
            continue
        if q:
            haystack = f"{s.name} {s.description}".lower()
            if q.lower() not in haystack:
                continue
        skills.append(
            SkillSummary(
                name=s.name,
                description=s.description,
                category=s.category,
                status=s.status,
                version=s.version,
                sla_minutes=s.sla_minutes,
                updated_at=s.updated_at,
            )
        )
    return skills


def get_skill(name: str) -> Skill:
    path = _skill_path(name)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    return _parse_skill_file(path)


def create_skill(req: SkillCreateRequest, user: str = "unknown") -> Skill:
    path = _skill_path(req.name)
    if path.exists():
        raise HTTPException(status_code=409, detail=f"Skill '{req.name}' already exists")

    skill = Skill(
        name=req.name,
        description=req.description,
        argument_hint=req.argument_hint,
        owner="internal-audit",
        category=req.category,
        status=SkillStatus.DRAFT,
        version="0.1.0",
        sla_minutes=req.sla_minutes,
        body=req.body,
        updated_at=datetime.now(timezone.utc),
        file_path=str(path),
    )
    path.write_text(_serialize_skill(skill), encoding="utf-8")
    return skill


def update_skill(name: str, req: SkillUpdateRequest, user: str = "unknown") -> Skill:
    skill = get_skill(name)
    if req.description is not None:
        skill.description = req.description
    if req.argument_hint is not None:
        skill.argument_hint = req.argument_hint
    if req.category is not None:
        skill.category = req.category
    if req.status is not None:
        skill.status = req.status
    if req.body is not None:
        skill.body = req.body
    if req.sla_minutes is not None:
        skill.sla_minutes = req.sla_minutes
    skill.updated_at = datetime.now(timezone.utc)
    Path(skill.file_path).write_text(_serialize_skill(skill), encoding="utf-8")
    return skill


def delete_skill(name: str, user: str = "unknown") -> None:
    path = _skill_path(name)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    # Soft delete — move to deprecated dir
    deprecated_dir = settings.skills_dir.parent / "deprecated"
    deprecated_dir.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path.rename(deprecated_dir / f"{name}.{stamp}.md")
