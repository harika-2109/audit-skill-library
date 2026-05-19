"""Skills API — list, get, create, update, delete."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, Query

from app.core.audit_log import log_event
from app.models.skill import (
    CATEGORY_ORDER,
    Skill,
    SkillCategory,
    SkillCreateRequest,
    SkillStatus,
    SkillSummary,
    SkillUpdateRequest,
)
from app.services import skill_repo

router = APIRouter(prefix="/api/skills", tags=["skills"])


def _user(x_user: Optional[str]) -> str:
    """Resolve actor — in prod, parse from SSO/Cognito header."""
    return x_user or "anonymous"


@router.get("", response_model=list[SkillSummary])
async def list_skills_route(
    category: Optional[SkillCategory] = None,
    status: Optional[SkillStatus] = None,
    q: Optional[str] = Query(
        default=None, description="Search name and description"),
) -> list[SkillSummary]:
    return skill_repo.list_skills(category=category, status=status, q=q)


@router.get("/_meta/categories")
async def list_categories() -> list[str]:
    """Returns audit categories in display order — used by the wizard."""
    return [c.value for c in CATEGORY_ORDER]


@router.get("/{name}", response_model=Skill)
async def get_skill_route(name: str) -> Skill:
    return skill_repo.get_skill(name)


@router.post("", response_model=Skill, status_code=201)
async def create_skill_route(
    req: SkillCreateRequest,
    x_user: Optional[str] = Header(default=None),
) -> Skill:
    actor = _user(x_user)
    skill = skill_repo.create_skill(req, user=actor)
    log_event(
        actor=actor,
        action="skill.create",
        resource_type="skill",
        resource_id=skill.name,
        metadata={"category": skill.category.value,
                  "status": skill.status.value},
    )
    return skill


@router.patch("/{name}", response_model=Skill)
async def update_skill_route(
    name: str,
    req: SkillUpdateRequest,
    x_user: Optional[str] = Header(default=None),
) -> Skill:
    actor = _user(x_user)
    before = skill_repo.get_skill(name)
    skill = skill_repo.update_skill(name, req, user=actor)
    log_event(
        actor=actor,
        action="skill.update",
        resource_type="skill",
        resource_id=name,
        metadata={
            "status_before": before.status.value,
            "status_after": skill.status.value,
            "version": skill.version,
        },
    )
    return skill


@router.delete("/{name}", status_code=200)
async def delete_skill_route(
    name: str,
    x_user: Optional[str] = Header(default=None),
) -> None:
    actor = _user(x_user)
    skill_repo.delete_skill(name, user=actor)
    log_event(
        actor=actor,
        action="skill.delete",
        resource_type="skill",
        resource_id=name,
    )
