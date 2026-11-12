"""Configure structured logging for the backend."""

import logging
import sys
from functools import partial

import structlog
from pydantic import field_validator
from pydantic_settings import BaseSettings
from structlog.types import EventDict, Processor


_NOISY_LOGGERS = (
    "httpcore",
    "httpx",
    "hpack",
    "urllib3",
    "boto3",
    "botocore",
    "s3transfer",
)


def _add_log_metadata(
    _logger, _method, event: EventDict, *, environment: str, release: str
) -> EventDict:
    event.update(service="kb-backend", environment=environment, release=release)
    return event


def _build_log_formatter(
    processors: list[Processor], *, local_output: bool
) -> structlog.stdlib.ProcessorFormatter:
    render_processors: list[Processor] = [
        structlog.stdlib.ProcessorFormatter.remove_processors_meta,
        structlog.processors.EventRenamer(to="message"),
    ]
    if local_output:
        render_processors.append(
            structlog.dev.ConsoleRenderer(
                colors=False,
                event_key="message",
                exception_formatter=structlog.dev.RichTracebackFormatter(
                    show_locals=False,
                ),
            )
        )
    else:
        render_processors.extend(
            [structlog.processors.format_exc_info, structlog.processors.JSONRenderer()]
        )
    return structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=[structlog.stdlib.ExtraAdder(), *processors],
        processors=render_processors,
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

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, value: str) -> str:
        level = value.upper()
        if level not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            raise ValueError(
                "LOG_LEVEL must be DEBUG, INFO, WARNING, ERROR or CRITICAL"
            )
        return level

    def init_logging(self, *, environment: str, release: str) -> None:
        """Install the application's Structlog formatter on the root handler."""
        processors: list[Processor] = [
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            partial(_add_log_metadata, environment=environment, release=release),
        ]
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                *processors,
                structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
            ],
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
        )
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            _build_log_formatter(
                processors, local_output=environment in ("local", "test")
            )
        )
        level = logging.getLevelNamesMapping()[self.LOG_LEVEL]
        logging.basicConfig(level=level, handlers=[handler], force=True)
        _configure_third_party_loggers(level)
