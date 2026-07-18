from contextvars import ContextVar, Token
from typing import Any


_runtime_config: ContextVar[dict[str, Any] | None] = ContextVar(
    "runtime_ai_config",
    default=None,
)


def set_runtime_ai_config(config: dict[str, Any]) -> Token:
    return _runtime_config.set(config)


def reset_runtime_ai_config(token: Token) -> None:
    _runtime_config.reset(token)


def get_runtime_ai_config() -> dict[str, Any]:
    return _runtime_config.get() or {}
