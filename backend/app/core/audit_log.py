"""Audit logging — every authoring action and execution.

In production: write to RDS audit_log table + CloudWatch.
For local dev: JSONL file.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("audit")

_AUDIT_LOG = Path(__file__).resolve().parents[2] / "audit.log.jsonl"


def log_event(
    actor: str,
    action: str,
    resource_type: str,
    resource_id: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Write a structured audit log line."""
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "actor": actor,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "metadata": metadata or {},
    }
    _AUDIT_LOG.parent.mkdir(parents=True, exist_ok=True)
    with _AUDIT_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
    logger.info("audit", extra={"audit_record": record})
