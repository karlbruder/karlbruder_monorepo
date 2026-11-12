import json
import logging
import sys


def test_cloud_output_includes_traceback_in_single_json_line(
    configure_log_formatter,
):
    """Cloud logs keep the formatted message and traceback in one JSON record."""
    try:
        raise ValueError("synthetic exception message")
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
    assert payload["logger"] == "app.test"
    assert "ValueError: synthetic exception message" in payload["exception"]
    assert "test_logging.py" in payload["exception"]


def test_local_output_contains_rich_traceback_without_frame_locals(
    configure_log_formatter,
):
    """Local tracebacks include the exception message and omit frame locals."""
    private_local = "".join(("synthetic", " local value"))
    try:
        raise RuntimeError("synthetic runtime failure")
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
    assert "RuntimeError:" in rendered
    assert "synthetic runtime failure" in rendered
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


def test_console_and_json_preserve_exception_chain_frames(configure_log_formatter):
    """Both outputs retain the storage cause and its traceback."""
    from botocore.exceptions import EndpointConnectionError

    from app.core.files.storage import FileStorageError

    try:
        try:
            raise EndpointConnectionError(endpoint_url="https://synthetic.example.org")
        except EndpointConnectionError as cause:
            raise FileStorageError("synthetic storage failure") from cause
    except FileStorageError:
        record = logging.LogRecord(
            "app.test", logging.ERROR, __file__, 1, "Storage failed", (), sys.exc_info()
        )

    for environment in ("test", "prod"):
        output = configure_log_formatter(environment).format(record)
        assert "FileStorageError" in output
        assert "EndpointConnectionError" in output
        if environment == "prod":
            exception = json.loads(output)["exception"]
            assert "EndpointConnectionError" in exception
            assert "test_logging.py" in exception
