"""API exception mappings leave unexpected failures to the framework."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.exception_handlers import register_api_exception_handlers


def test_unexpected_failures_remain_server_errors_without_exposing_details():
    app = FastAPI()
    register_api_exception_handlers(app)

    @app.get("/unexpected-failure")
    def unexpected_failure():
        raise RuntimeError("private implementation details")

    response = TestClient(app, raise_server_exceptions=False).get("/unexpected-failure")

    assert response.status_code == 500
    assert response.text == "Internal Server Error"
