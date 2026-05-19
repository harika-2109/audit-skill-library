"""Chat API — streaming responses from Claude, skill-aware."""
from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse

from app.core.audit_log import log_event
from app.models.skill import ChatRequest
from app.services import llm_client, skill_repo

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
async def chat_route(
    req: ChatRequest,
    x_user: Optional[str] = Header(default=None),
) -> StreamingResponse:
    """Stream a chat response. Optionally grounded in a specific skill."""
    actor = x_user or "anonymous"

    # Build the message list. If a skill is in context, inject its body as a
    # system-style preface so the model has the procedure to follow.
    messages = [m.model_dump() for m in req.messages]
    if req.skill_context:
        skill = skill_repo.get_skill(req.skill_context)
        # Prepend the skill body as an assistant-context message
        preface = (
            f"# Active skill: {skill.name}\n\n{skill.description}\n\n---\n\n{skill.body}"
        )
        messages = [{"role": "user", "content": preface},
                    {"role": "assistant", "content": "Skill loaded. Ready to proceed."},
                    *messages]

    log_event(
        actor=actor,
        action="chat.start",
        resource_type="conversation",
        resource_id=req.skill_context or "general",
        metadata={"message_count": len(req.messages)},
    )

    async def event_stream():
        try:
            async for delta in llm_client.stream_chat(
                messages=messages,
                skill_context=req.skill_context,
            ):
                yield f"data: {json.dumps({'type': 'delta', 'text': delta})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
