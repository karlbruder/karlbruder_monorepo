"""Configure structured logging for the backend."""

import logging
import sys
from typing import Any

import structlog
from pydantic import field_validator
from pydantic_settings import BaseSettings
from structlog.types import Processor

from config.env import IS_LOCAL_ENV


_NOISY_LOGGERS = (
    "httpcore",
    "httpx",
    "hpack",
    "urllib3",
    "boto3",
    "botocore",
    "s3transfer",
)


def _build_console_renderer() -> Processor:
    options: dict[str, Any] = {
        "colors": False,
        "timestamp_key": "timestamp",
        "event_key": "message",
    }
    if getattr(structlog.dev, "rich", None) is not None:
        options["exception_formatter"] = structlog.dev.RichTracebackFormatter(
            show_locals=False,
            max_frames=2,
        )
    return structlog.dev.ConsoleRenderer(**options)


def _build_formatter_processors(*, json_logs: bool) -> list[Processor]:
    processors: list[Processor] = [
        structlog.stdlib.ProcessorFormatter.remove_processors_meta,
        structlog.processors.EventRenamer(to="message"),
    ]
    if json_logs:
        if IS_LOCAL_ENV:
            processors.append(structlog.processors.ExceptionPrettyPrinter())
        else:
            processors.append(structlog.processors.ExceptionRenderer())
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(_build_console_renderer())
    return processors


def _build_log_formatter(
    shared_processors: list[Processor], *, json_logs: bool
) -> structlog.stdlib.ProcessorFormatter:
    processors = _build_formatter_processors(json_logs=json_logs)
    foreign_pre_chain = [structlog.stdlib.ExtraAdder(), *shared_processors]
    return structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=foreign_pre_chain,
        processors=processors,
    )


def _configure_third_party_loggers(level: int) -> None:
    for name in _NOISY_LOGGERS:
        logging.getLogger(name).setLevel(max(level, logging.WARNING))

    for name in ("uvicorn", "uvicorn.error"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True
        logger.setLevel(logging.CRITICAL)

    # The ASGI middleware owns access logging.
    access_logger = logging.getLogger("uvicorn.access")
    access_logger.handlers.clear()
    access_logger.propagate = False
    access_logger.setLevel(logging.CRITICAL)


class LoggingSettings(BaseSettings):
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, value: str) -> str:
        level = value.upper()
        if level not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            raise ValueError(
                "LOG_LEVEL must be DEBUG, INFO, WARNING, ERROR or CRITICAL"
            )
        return level

    def init_logging(self) -> None:
        """Install the application's Structlog formatter on the root handler."""
        shared_processors: list[Processor] = [
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
        ]
        structlog_processors: list[Processor] = [
            structlog.stdlib.filter_by_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ]
        structlog.configure(
            processors=structlog_processors,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )

        formatter = _build_log_formatter(shared_processors, json_logs=self.LOG_JSON)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)

        level = logging.getLevelNamesMapping()[self.LOG_LEVEL]
        logging.basicConfig(level=level, handlers=[handler], force=True)
        _configure_third_party_loggers(level)
