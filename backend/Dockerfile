FROM python:3.12-slim-bookworm

# Variáveis de ambiente recomendadas
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV POETRY_VERSION=1.8.4

WORKDIR /app

# Dependências do sistema (psycopg, build tools)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Instala Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s /root/.local/bin/poetry /usr/local/bin/poetry

# Configura Poetry para não criar venv
RUN poetry config virtualenvs.create false

# Copia arquivos de dependência primeiro (cache eficiente)
COPY pyproject.toml poetry.lock* ./

# Instala dependências
RUN poetry install --no-root --only main

# Copia o código da aplicação
COPY . .

# Porta do FastAPI
EXPOSE 8000

# Comando de produção
CMD ["gunicorn", "main:karlbruder_app", "-k", "uvicorn.workers.UvicornWorker", "-w", "2", "-b", "0.0.0.0:8000"]
