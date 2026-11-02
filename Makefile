.DEFAULT_GOAL := help

TEST_PROJECT ?= kb-test-local
FRONTEND_CI_SUPABASE_URL ?= https://ci.example.supabase.co
FRONTEND_CI_SUPABASE_PUBLISHABLE_KEY ?= sb_publishable_ci_not_a_real_key
LANDING_CI_APPLICATION_URL ?= https://app.example.test

.PHONY: help up down down-volumes recreate-backend recreate-frontend recreate-landing db-drop db-seed db-reset test-backend lint-backend test-frontend test-landing build-backend build-frontend build-landing ci-backend ci-frontend ci-landing ci

help:
	@echo "Local commands. Run them from the repository root."
	@echo ""
	@echo "  make up                  Build and start the local services"
	@echo "  make down                Stop the local services and keep the database volume"
	@echo "  make down-volumes        Stop the local services and delete the database volume"
	@echo "  make recreate-backend    Rebuild the backend after a dependency or environment change"
	@echo "  make recreate-frontend   Rebuild the frontend after a dependency or environment change"
	@echo "  make recreate-landing    Rebuild the landing site after a dependency or environment change"
	@echo "  make db-reset            Drop, migrate, and seed the local Compose database"
	@echo "  make db-drop             Recreate public and apply Alembic head"
	@echo "  make db-seed             Insert the local Monomachia event when it is missing"
	@echo "  make test-backend        Run backend pytest in an isolated Compose project"
	@echo "  make lint-backend        Run Ruff in that same test project"
	@echo "  make test-frontend       Run Vitest in the local frontend container"
	@echo "  make test-landing        Run the landing tests in the local landing container"
	@echo "  make build-backend       Build the backend production image"
	@echo "  make build-frontend      Build the frontend production image with CI placeholders"
	@echo "  make build-landing       Build the landing production image with an example application URL"
	@echo "  make ci-backend          Build the backend image, then run pytest and Ruff"
	@echo "  make ci-frontend         Test, lint, and build the frontend image without frontend/.env"
	@echo "  make ci-landing          Test and build the landing image without landing/.env"
	@echo "  make ci                  Run ci-backend, ci-frontend, and ci-landing"
	@echo ""
	@echo "Override the backend test project with TEST_PROJECT=kb-test-name."
	@echo "test-frontend and test-landing use compose.yml, so the matching .env file must exist."
	@echo "The ci-* targets do not. They match the GitHub Actions workflows."

up:
	docker compose up --build -d

down:
	docker compose down --remove-orphans

down-volumes:
	docker compose down --remove-orphans --volumes

recreate-backend:
	docker compose up -d --build --force-recreate backend

recreate-frontend:
	docker compose up -d --build --force-recreate frontend

recreate-landing:
	docker compose up -d --build --force-recreate landing

db-drop:
	./scripts/local_database.sh drop

db-seed:
	./scripts/local_database.sh seed

db-reset:
	./scripts/local_database.sh reset

test-backend:
	docker compose -f compose.test.yml -p $(TEST_PROJECT) run --rm backend pytest -x; \
	status=$$?; \
	docker compose -f compose.test.yml -p $(TEST_PROJECT) down -v; \
	exit $$status

lint-backend:
	docker compose -f compose.test.yml -p $(TEST_PROJECT) run --rm backend ruff check .; \
	status=$$?; \
	docker compose -f compose.test.yml -p $(TEST_PROJECT) down -v; \
	exit $$status

test-frontend:
	docker compose run --rm --no-deps frontend npm test

test-landing:
	docker compose run --rm --no-deps -e CI=true landing npm test -- --watchAll=false

build-backend:
	docker build -f backend/Dockerfile --target production backend

build-frontend:
	VITE_SUPABASE_PUBLISHABLE_KEY=$(FRONTEND_CI_SUPABASE_PUBLISHABLE_KEY) \
	docker build -f frontend/Dockerfile --target production \
		--build-arg VITE_SUPABASE_URL=$(FRONTEND_CI_SUPABASE_URL) \
		--secret id=VITE_SUPABASE_PUBLISHABLE_KEY,env=VITE_SUPABASE_PUBLISHABLE_KEY \
		frontend

build-landing:
	docker build -f landing/Dockerfile --target production \
		--build-arg REACT_APP_APPLICATION_URL=$(LANDING_CI_APPLICATION_URL) \
		landing

ci-backend: build-backend test-backend lint-backend

ci-frontend:
	docker build -f frontend/Dockerfile --target development -t kb-frontend-ci frontend
	docker run --rm kb-frontend-ci npm test
	docker run --rm kb-frontend-ci npm run lint
	$(MAKE) build-frontend

ci-landing:
	docker build -f landing/Dockerfile --target development -t kb-landing-ci landing
	docker run --rm -e CI=true kb-landing-ci npm test -- --watchAll=false
	$(MAKE) build-landing

ci: ci-backend ci-frontend ci-landing
