"""LLM client — wraps Anthropic SDK with Bedrock fallback.

In dev: direct Anthropic API.
In regulated enterprise prod: AWS Bedrock (typically the approved path).
"""
from __future__ import annotations

import logging
from typing import AsyncIterator

from anthropic import Anthropic, AsyncAnthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


def _client() -> AsyncAnthropic:
    if settings.use_bedrock:
        # AnthropicBedrock for prod. Requires aws creds in environment / IAM role.
        from anthropic import AsyncAnthropicBedrock

        return AsyncAnthropicBedrock(aws_region=settings.aws_region)
    return AsyncAnthropic(api_key=settings.anthropic_api_key)


SYSTEM_PROMPT = """You are an internal audit assistant.

You have access to a library of audit skills — markdown procedures covering SOX
testing, risk assessment, walkthroughs, sampling, issue write-ups, regulatory
mapping, and continuous controls monitoring.

When a user invokes a skill or asks a question that maps to a skill:
1. Use the skill's procedure as your authoritative guide
2. Ask for any required inputs the skill specifies before proceeding
3. Produce output in the structure the skill defines
4. Cite the relevant authority (PCAOB, IIA, COSO, internal manual)

When uncertain or when a question is out of scope of the loaded skills, say so
clearly. Do not fabricate control IDs, regulatory citations, or sample data.

Be concise. Auditors are senior practitioners. Skip preamble."""


async def stream_chat(
    messages: list[dict],
    skill_context: str | None = None,
) -> AsyncIterator[str]:
    """Stream a chat completion from Claude. Yields text deltas."""
    system = SYSTEM_PROMPT
    if skill_context:
        system += f"\n\nThe user is currently working with the '{skill_context}' skill. " \
                  "Treat its procedure as the authoritative process for this conversation."

    client = _client()
    async with client.messages.stream(
        model=settings.anthropic_model,
        max_tokens=4096,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text
