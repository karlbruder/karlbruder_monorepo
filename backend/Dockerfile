# ----
# Base
# ----
FROM python:3.12-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV POETRY_VERSION=1.8.4
ENV POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s /root/.local/bin/poetry /usr/local/bin/poetry

# -----------
# Development
# -----------
FROM base AS development

COPY pyproject.toml poetry.lock ./
RUN poetry install --no-root --with dev

EXPOSE 8000

CMD ["uvicorn", "app.main:karlbruder_app", "--no-access-log", "--reload", "--reload-exclude", ".venv", "--host", "0.0.0.0", "--port", "8000"]

# ----
# Test
# ----
FROM development AS test

CMD ["pytest", "-x"]

# -------
# Builder
# -------
FROM base AS builder

COPY pyproject.toml poetry.lock ./
RUN poetry install --no-root --only main

# ----------
# Production
# ----------
FROM base AS production

ARG GIT_SHA=NaN
ARG RELEASED_AT=unknown
ENV GIT_SHA=${GIT_SHA}
ENV RELEASED_AT=${RELEASED_AT}

COPY --from=builder /usr/local /usr/local
COPY . /app

EXPOSE 8000

ENTRYPOINT ["sh", "/app/entrypoint.production.sh"]

CMD ["uvicorn", "app.main:karlbruder_app", "--no-access-log", "--workers", "2", "--host", "0.0.0.0", "--port", "8000"]
