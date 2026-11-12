import json
import logging
import sys


def test_cloud_output_formats_message_and_omits_exception_values(
    configure_log_formatter,
):
    """Cloud logs keep the formatted message and safe exception locations."""
    try:
        raise ValueError("private exception value")
    except ValueError:
        record = logging.LogRecord(
            "app.test",
            logging.ERROR,
            __file__,
            1,
            "First line\n%s",
            ("second line",),
            sys.exc_info(),
        )

    line = configure_log_formatter("prod").format(record)
    payload = json.loads(line)
    assert "\n" not in line
    assert payload["message"] == "First line\nsecond line"
    assert "private exception value" not in line
    assert payload["logger"] == "app.test"
    assert payload["exception"]["type"] == "ValueError"
    assert payload["exception"]["frames"][0]["filename"] == "test_logging.py"


def test_local_output_contains_safe_rich_traceback(configure_log_formatter):
    """Local tracebacks show exception type and frames without locals or values."""
    private_local = "private local value"
    try:
        raise RuntimeError(private_local)
    except RuntimeError:
        record = logging.LogRecord(
            "app.test",
            logging.ERROR,
            __file__,
            1,
            "File storage request failed",
            (),
            sys.exc_info(),
        )
    rendered = configure_log_formatter("test").format(record)
    assert "File storage request failed" in rendered
    assert "Traceback" in rendered
    assert "RuntimeError" in rendered
    assert "test_logging.py" in rendered
    assert private_local not in rendered


def test_native_record_uses_the_same_formatter(configure_log_formatter):
    """Structlog events use the same service metadata and retain caller fields."""
    import structlog

    formatter = configure_log_formatter("prod")
    lines = []

    class Capture(logging.Handler):
        def emit(self, record):
            lines.append(self.format(record))

    handler = Capture()
    handler.setFormatter(formatter)
    logger = logging.getLogger("app.test.native")
    logger.addHandler(handler)
    try:
        structlog.get_logger(logger.name).warning(
            "new_application_event",
            context={"result": "approved"},
        )
    finally:
        logger.removeHandler(handler)
    assert len(lines) == 1
    payload = json.loads(lines[0])
    assert payload["message"] == "new_application_event"
    assert payload["service"] == "kb-backend"
    assert payload["context"] == {"result": "approved"}


def test_configure_logging_clears_uvicorn_handlers_and_quiets_dependencies(
    configure_log_formatter, monkeypatch
):
    """Uvicorn access output stays disabled and noisy libraries start at warning."""
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        monkeypatch.setattr(
            logging.getLogger(name), "handlers", [logging.NullHandler()]
        )

    configure_log_formatter("test")

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        assert logging.getLogger(name).handlers == []
    assert logging.getLogger("uvicorn.error").propagate
    assert not logging.getLogger("uvicorn.access").propagate
    assert logging.getLogger("uvicorn.access").level == logging.CRITICAL
    assert logging.getLogger("httpx").level >= logging.WARNING
