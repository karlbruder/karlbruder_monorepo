.DEFAULT_GOAL := help

TEST_PROJECT ?= kb-test-local

.PHONY: help up down down-volumes recreate-backend recreate-frontend recreate-landing db-drop db-seed db-reset test-backend lint-backend test-frontend test-landing

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
	@echo "  make test-frontend       Run Vitest in the frontend development image"
	@echo "  make test-landing        Run the landing tests in the landing development image"
	@echo ""
	@echo "Override the backend test project with TEST_PROJECT=kb-test-name."

up:
	docker compose up --build

down:
	docker compose down

down-volumes:
	docker compose down -v

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
