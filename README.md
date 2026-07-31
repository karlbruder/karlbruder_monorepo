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
Elas são intencionalmente simples e não devem ser reutilizadas fora do ambiente
local. A porta é publicada apenas em `127.0.0.1`, portanto o banco não fica
exposto diretamente à rede da máquina.

Sem `DATABASE_URL` no arquivo `.env` da raiz, o Compose injeta no backend a
configuração local padrão:

```text
DATABASE_URL=postgresql://user:password@db:5432/kb-db
```

`db` é o nome DNS do serviço dentro da rede do Compose. Para testar o mesmo
backend com o Supabase, copie [`.env.example`](.env.example) para `.env` e
preencha `DATABASE_URL` com a URI Postgres do Supabase. O Compose usa a expressão
`${DATABASE_URL:-postgresql://user:password@db:5432/kb-db}`: uma variável
preenchida substitui o padrão; ausente ou vazia mantém o banco local.

Depois de incluir, alterar ou remover `DATABASE_URL`, recrie o backend:

```powershell
docker compose up -d --force-recreate backend
```

O serviço `db` continua disponível nos dois casos, mas cada processo do backend
mantém apenas uma conexão SQL ativa. Os dois bancos não são sincronizados.
Para executar o backend diretamente na máquina host, defina explicitamente
`DATABASE_URL`; fora do Compose não existe o fallback com host `db`.

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

Os dados locais são independentes dos dados do Supabase e não são sincronizados
automaticamente. Quando o projeto tiver migrations Alembic, as mesmas migrations
deverão ser aplicadas nos dois ambientes para manter a estrutura equivalente.

## Banco no deploy: EC2 e Supabase

O `compose.yml` deste repositório é destinado ao desenvolvimento local. No
deploy da EC2, o backend e o frontend são executados sem o serviço `db`. O
backend recebe pela variável `DATABASE_URL` a URI do Postgres do mesmo projeto
Supabase usado pelo Supabase Auth.

Não existe código condicional para criar engines diferentes. A mesma engine lê
o valor final de `DATABASE_URL`:

```text
Local: DATABASE_URL -> Postgres do Compose
EC2:   DATABASE_URL -> Postgres do Supabase
```

Como o backend da EC2 é um serviço persistente, escolha no painel **Connect** do
Supabase uma destas opções:

- conexão direta, quando a EC2/VPC tiver conectividade IPv6 ou o projeto
  Supabase tiver o add-on IPv4;
- Supavisor em **session mode**, porta 5432, quando a EC2 tiver somente IPv4.

Consulte também a documentação oficial sobre
[conexões Postgres do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
Use SSL na conexão remota, por exemplo com `sslmode=require`, caso esse parâmetro
não esteja presente na URI fornecida pelo painel. Transaction mode é voltado a
clientes serverless e não é a opção indicada para esse backend persistente.

A URI contém a senha do banco e deve ser armazenada no AWS Secrets Manager ou
no SSM Parameter Store e injetada no ambiente do container como `DATABASE_URL`.
Nunca coloque a URI em código, Dockerfile, arquivos versionados ou variáveis
`VITE_*`: qualquer variável empacotada no frontend fica visível ao navegador.

### Separação de schemas

O banco Supabase é compartilhado, mas os dados permanecem separados por schema:

- `auth`: gerenciado pelo Supabase Auth;
- `public`: tabelas, índices e migrations do domínio Karlbruder.

Modelos e migrations futuros do backend devem criar objetos de domínio
explicitamente em `public` e não devem alterar objetos pertencentes a `auth`.

### Validação manual na EC2

Depois de injetar a secret e iniciar o backend sem o Postgres local:

1. Abra `GET /health` e confirme que a API está ativa.
2. Abra `GET /health/db`.
3. Confirme HTTP 200 e a resposta:

   ```json
   {
     "status": "ok",
     "database": "connected",
     "database_target": "supabase",
     "result": 1,
     "schemas": {
       "public": true,
       "auth": true
     }
   }
   ```

`database_target` pode ser `local`, `supabase` ou `external`. No Postgres local,
`public` existe e `auth` normalmente aparece como `false`; no Supabase, ambos
devem existir. A ausência de `auth` no banco local não torna o serviço unhealthy.
Uma falha de configuração, conexão ou consulta retorna HTTP 503 sem expor a URI
ou detalhes internos. Consulte os logs privados do backend para investigar.

## Testes do backend

Com Python e Poetry instalados:

```powershell
cd backend
poetry install
poetry run pytest
poetry run ruff check database.py main.py tests
```

Para o smoke test integrado, execute o Compose e confirme que os serviços
`db`, `backend` e `frontend` ficam saudáveis. O healthcheck do container backend
usa `/health/db`, portanto ele só fica saudável quando o `SELECT 1` funciona.
