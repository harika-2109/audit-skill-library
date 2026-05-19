"""Domain models for the Internal Audit skill library."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SkillStatus(str, Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    PUBLISHED = "published"
    DEPRECATED = "deprecated"


class SkillCategory(str, Enum):
    """Audit skill categories."""
    PLANNING = "planning"
    DOCUMENTATION = "documentation"
    SOX = "sox"
    TESTING = "testing"
    REPORTING = "reporting"
    REGULATORY = "regulatory"
    MONITORING = "monitoring"


CATEGORY_ORDER: list[SkillCategory] = [
    SkillCategory.PLANNING,
    SkillCategory.DOCUMENTATION,
    SkillCategory.SOX,
    SkillCategory.TESTING,
    SkillCategory.REPORTING,
    SkillCategory.REGULATORY,
    SkillCategory.MONITORING,
]


class Skill(BaseModel):
    """A skill is frontmatter plus body content."""

    name: str
    description: str
    argument_hint: Optional[str] = None
    owner: str = "internal-audit"
    category: SkillCategory
    status: SkillStatus
    version: str
    sla_minutes: Optional[int] = None
    body: str
    updated_at: datetime
    file_path: str


class SkillSummary(BaseModel):
    """Lightweight skill view for catalog listing."""

    name: str
    description: str
    category: SkillCategory
    status: SkillStatus
    version: str
    sla_minutes: Optional[int]
    updated_at: datetime


class SkillCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")
    description: str = Field(min_length=20, max_length=500)
    argument_hint: Optional[str] = Field(default=None, max_length=120)
    category: SkillCategory
    body: str = Field(min_length=50)
    sla_minutes: Optional[int] = Field(default=None, ge=1, le=600)


class SkillUpdateRequest(BaseModel):
    description: Optional[str] = None
    argument_hint: Optional[str] = None
    category: Optional[SkillCategory] = None
    status: Optional[SkillStatus] = None
    body: Optional[str] = None
    sla_minutes: Optional[int] = None


# -------- Wizard intake --------

class WizardIntake(BaseModel):
    """Structured intake from the wizard — 8 audit-specific questions.

    Claude turns this into a SKILL.md draft.
    """

    summary: str = Field(min_length=10, max_length=400,
                         description="One-sentence summary of what the skill does")
    category: SkillCategory = Field(
        description="Which audit category this skill falls under")
    trigger: str = Field(min_length=10, max_length=600,
                         description="When an auditor would invoke this skill")
    inputs: str = Field(min_length=10, max_length=800,
                        description="What inputs the auditor must provide")
    connectors: Optional[str] = Field(default=None, max_length=400,
                                      description="Systems / data sources the skill needs (RCM, SAP, etc.)")
    output: str = Field(min_length=10, max_length=600,
                        description="What the skill produces (workpaper, issue, report, etc.)")
    standards: Optional[str] = Field(default=None, max_length=500,
                                     description="Authoritative standards (PCAOB AS, IIA, COSO) that apply")
    sla_minutes: Optional[int] = Field(default=None, ge=5, le=600,
                                       description="Typical time to complete in minutes")
    suggested_name: Optional[str] = Field(default=None, max_length=80,
                                          description="Suggested kebab-case skill name (Claude will pick if empty)")


class SkillScaffoldResponse(BaseModel):
    """Claude's draft of the skill, ready for human editing."""

    name: str
    description: str
    argument_hint: Optional[str]
    body: str
    notes: list[str] = Field(default_factory=list,
                             description="Things the human should review/fill in")


# -------- Chat --------

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    skill_context: Optional[str] = None


class ChatResponse(BaseModel):
    content: str
    skill_referenced: Optional[str] = None
