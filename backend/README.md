# Backend Karlbruder

API FastAPI responsável pela lógica de domínio e pelo acesso ao Postgres.

## Configuração

`DATABASE_URL` representa a única configuração de conexão SQL:

- sem a variável no `.env` da raiz, o Docker Compose usa o serviço `db` local;
- com a variável no `.env`, o Compose usa a URI informada, inclusive Supabase;
- o deploy na EC2 injeta, por secret, a URI do Postgres do Supabase.

O fallback local pertence ao Compose. Ao executar o backend diretamente na
máquina, `DATABASE_URL` continua obrigatória. Use
[`../.env.example`](../.env.example) como referência e não versione credenciais.

## Desenvolvimento

```powershell
poetry install
poetry run uvicorn main:karlbruder_app --reload
```

## Testes

```powershell
poetry run pytest
poetry run ruff check database.py main.py tests
```

Os critérios da issue PF-01 estão consolidados em
`tests/pf_01_test_backend_postgres_supabase.py`. Os checks estáticos e unitários
rodam normalmente; conexões reais são habilitadas explicitamente.

Com o Compose local já iniciado:

```powershell
$env:PF01_RUN_LOCAL_INTEGRATION = "1"
poetry run pytest tests/pf_01_test_backend_postgres_supabase.py
Remove-Item Env:PF01_RUN_LOCAL_INTEGRATION
```

Para incluir o aceite remoto, crie o arquivo ignorado `.env.supabase` com a
`DATABASE_URL` Postgres e execute:

```powershell
$env:PF01_RUN_LOCAL_INTEGRATION = "1"
$env:PF01_RUN_SUPABASE_INTEGRATION = "1"
poetry run pytest tests/pf_01_test_backend_postgres_supabase.py
Remove-Item Env:PF01_RUN_LOCAL_INTEGRATION
Remove-Item Env:PF01_RUN_SUPABASE_INTEGRATION
```

Sem as flags, os testes que acessariam bancos reais são marcados como skipped.
O teste nunca imprime a URI nem a senha do Supabase.

O endpoint `GET /health/db` executa `SELECT 1`, classifica a conexão como
`local`, `supabase` ou `external` e informa se os schemas `public` e `auth`
existem. Retorna HTTP 200 quando as consultas funcionam e HTTP 503 sem detalhes
sensíveis quando a conexão falha. `auth: false` é esperado no Postgres local.

As tabelas e migrations de domínio devem usar o schema `public`. O schema
`auth` pertence ao Supabase Auth e não deve ser alterado pelo backend.

