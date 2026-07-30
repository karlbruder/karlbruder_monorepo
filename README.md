# Karlbrüder

Monorepo do site e do sistema da escola de esgrima Karlbrüder.

## Estrutura

- `landing/`: site institucional público em React.
- `frontend/`: aplicação React com TypeScript e Vite.
- `backend/`: API FastAPI gerenciada com Poetry.
- `compose.yml`: ambiente local com frontend, backend e PostgreSQL.

Nesta etapa, a aplicação local não possui autenticação. O ambiente é composto
somente pelo frontend, pelo backend e pelo PostgreSQL local.

## Requisitos

Para executar todo o ambiente local, instale:

- Git
- Docker Desktop com Docker Compose

Python, Poetry, Node.js e PostgreSQL não precisam estar instalados diretamente
na máquina quando o projeto é executado com Docker.

## Executar o sistema

Abra o Docker Desktop e, na raiz do repositório, execute:

```powershell
docker compose up --build
```

Na primeira execução, o Docker baixará as imagens e construirá o frontend e o
backend. Aguarde até os serviços aparecerem como iniciados.

Depois, acesse:

- Aplicação: http://localhost:3000
- Diagnóstico visual: http://localhost:3000/health
- API: http://localhost:8000
- Documentação Swagger: http://localhost:8000/docs
- Health do backend: http://localhost:8000/health
- Health do banco: http://localhost:8000/health/db

O PostgreSQL fica disponível em `localhost:5432` com os seguintes dados locais:

```text
database: kb-db
user: user
password: password
```

Essas credenciais são exclusivas do ambiente local definido no Compose.

## Encerrar o sistema

No terminal em que o Compose está em execução, pressione `Ctrl+C`. Para remover
os containers e a rede local depois disso, execute:

```powershell
docker compose down
```

O volume do PostgreSQL é preservado por esse comando. Não use
`docker compose down -v` se quiser manter os dados locais.

## Fluxo local

O navegador acessa somente o frontend. O Nginx encaminha requisições iniciadas
com `/api/` para o FastAPI, e somente o backend acessa o PostgreSQL:

```text
Navegador -> Nginx/React -> FastAPI -> PostgreSQL
```

O frontend nunca se conecta diretamente ao banco de dados.
