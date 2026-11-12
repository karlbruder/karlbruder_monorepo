"""Configure structured logging for the backend."""

import logging
import sys
from functools import partial
from pathlib import Path
from types import TracebackType

import structlog
from pydantic import field_validator
from pydantic_settings import BaseSettings
from rich.console import Console
from rich.traceback import Frame, Stack, Trace, Traceback
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


def _format_exception_frames(_logger, _method, event):
    info = event.pop("exc_info", None)
    if info is True:
        info = sys.exc_info()
    elif isinstance(info, BaseException):
        info = (type(info), info, info.__traceback__)
    if isinstance(info, tuple) and info[0]:
        exception_type = info[0].__name__
        frames = []
        tb: TracebackType | None = info[2]
        while tb is not None:
            code = tb.tb_frame.f_code
            frames.append(
                {
                    "filename": Path(code.co_filename).name,
                    "line": tb.tb_lineno,
                    "function": code.co_name,
                }
            )
            tb = tb.tb_next
        event["exception"] = {"type": exception_type, "frames": frames}
    return event


def _render_console_log(logger, method, event):
    exception = event.pop("exception", None)
    line = structlog.dev.ConsoleRenderer(colors=False, event_key="message")(
        logger, method, event
    )
    if exception is None:
        return line
    frames = [
        Frame(
            filename="",
            lineno=frame["line"],
            name=f'{frame["filename"]} ({frame["function"]})',
            line="",
        )
        for frame in exception["frames"]
    ]
    console = Console(force_terminal=False, width=100)
    with console.capture() as capture:
        console.print(
            Traceback(
                trace=Trace(
                    stacks=[
                        Stack(exc_type=exception["type"], exc_value="", frames=frames)
                    ]
                )
            )
        )
    return f"{line}\n{capture.get().rstrip()}"


def _build_log_formatter(
    processors: list[Processor], *, local_output: bool
) -> structlog.stdlib.ProcessorFormatter:
    return structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=[structlog.stdlib.ExtraAdder(), *processors],
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.EventRenamer(to="message"),
            _format_exception_frames,
            _render_console_log
            if local_output
            else structlog.processors.JSONRenderer(),
        ],
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
