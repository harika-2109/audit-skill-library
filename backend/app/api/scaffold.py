"""Skill scaffolding API — Claude drafts a SKILL.md from the wizard intake."""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from app.core.audit_log import log_event
from app.models.skill import SkillScaffoldResponse, WizardIntake
from app.services import skill_scaffold

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scaffold", tags=["wizard"])


@router.post("", response_model=SkillScaffoldResponse)
async def scaffold_route(
    intake: WizardIntake,
    x_user: Optional[str] = Header(default=None),
) -> SkillScaffoldResponse:
    actor = x_user or "anonymous"
    try:
        result = await skill_scaffold.scaffold_skill(intake)
    except Exception as e:
        logger.exception("scaffold failed")
        raise HTTPException(status_code=502, detail=f"Scaffold failed: {e}")
    log_event(
        actor=actor,
        action="skill.scaffold",
        resource_type="skill_draft",
        resource_id=result.name,
        metadata={
            "category": intake.category.value,
            "summary_chars": len(intake.summary),
        },
    )
    return result
