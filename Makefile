# **************************************************************************** #
#                                    CONFIG                                    #
# **************************************************************************** #

COMPOSE := $(shell \
	if docker compose version >/dev/null 2>&1; then \
		printf '%s' 'docker compose'; \
	else \
		printf '%s' 'docker-compose'; \
	fi \
)

BRANCH := $(shell git branch --show-current 2>/dev/null)

# **************************************************************************** #
#                                    HELP                                      #
# **************************************************************************** #

all:
	@if ! $(MAKE) env-check; then \
		$(MAKE) env-init; \
	fi
	@$(MAKE) up

help:
	@echo "Usage: Docker"
	@echo "  make up                  -> Build and start all containers in background"
	@echo "  make down                -> Stop containers"
	@echo "  make clean               -> Remove containers and images, keep volumes"
	@echo "  make fclean              -> Full clean: containers, images and volumes"
	@echo "  make re                  -> Full clean then rebuild and start"
	@echo "  make restart             -> Restart all containers with rebuild"
	@echo "  make logs                -> Follow all docker logs"
	@echo "  make logs-back           -> Follow backend logs"
	@echo "  make logs-front          -> Follow frontend logs"
	@echo "  make logs-db             -> Follow database logs"
	@echo "  make page                -> Open the frontend in Firefox"
	@echo "  make ps                  -> Show running containers"
	@echo "  make test-stack          -> Check frontend, backend and database status quickly"
	@echo "  make smoke-test          -> Run quick automated checks on the running stack"
	@echo "  make env-init            -> Create .env from .env.example if missing"
	@echo "  make env-check           -> Check required variables in .env"
	@echo "  make shell-back          -> Open shell in backend container"
	@echo "  make shell-front         -> Open shell in frontend container"
	@echo "  make shell-db            -> Open a psql session in the db container"
	@echo "Usage: Git"
	@echo "  make branch              -> Show current git branch"
	@echo "  make branch-create name=issue_1/feature/ma-branche"
	@echo "                           -> Create a branch from dev"
	@echo "  make branch-create-push name=issue_1/feature/ma-branche"
	@echo "                           -> Create and push a branch from dev"
	@echo "  make duplicate_branch name=issue_1/copy/ma-branche"
	@echo "                           -> Duplicate current branch into a copy branch"
	@echo "  make push m=\"your message\""
	@echo "                           -> Add, commit and push current branch"
	@echo "  make push-dev m=\"your message\""
	@echo "                           -> Add, commit and push dev branch"
	@echo "  make status              -> Git status"
	@echo "  make pull-dev            -> Update dev, then sync current branch with it"
	@echo "  make pull-branch name=issue_1/feature/ma-branche"
	@echo "                           -> Update target branch, then sync current branch with it"
	@echo "  make merge-dev           -> Merge current branch into dev"
	@echo "  make rebase-dev          -> Rebase current branch onto dev"
	@echo "  make push-file-dev file=Makefile     -> Push one file to dev branch"

# **************************************************************************** #
#                                  DOCKER                                      #
# **************************************************************************** #

compose-check:
	@$(COMPOSE) version >/dev/null 2>&1 || { \
		echo "❌ Ni 'docker compose' ni 'docker-compose' n'est disponible sur cette machine."; \
		exit 1; \
	}

up: compose-check
	$(COMPOSE) up --build -d --wait

down: compose-check
	$(COMPOSE) down

clean: compose-check
	$(COMPOSE) down --rmi all

fclean: compose-check
	$(COMPOSE) down -v --rmi all

re: fclean up

restart: compose-check
	$(COMPOSE) down && $(COMPOSE) up --build

logs: compose-check
	$(COMPOSE) logs -f

logs-back: compose-check
	$(COMPOSE) logs -f backend

logs-front: compose-check
	$(COMPOSE) logs -f frontend

logs-db: compose-check
	$(COMPOSE) logs -f db

page:
	open -a Firefox "http://localhost:$${FRONTEND_PORT:-3000}"

ps: compose-check
	$(COMPOSE) ps

test-stack: compose-check
	$(COMPOSE) ps
	@echo "Frontend : http://localhost:$${FRONTEND_PORT:-3000}"
	@echo "Backend  : http://localhost:$${BACKEND_PORT:-4000}/health"
	@echo "Database : localhost:$${POSTGRES_PORT:-5432}"

smoke-test:
	bash scripts/smoke-test.sh

env-init:
	@if [ -f .env ]; then \
		echo "⚠️ .env existe deja, aucune action faite"; \
	else \
		cp .env.example .env; \
		echo "✅ .env cree depuis .env.example"; \
	fi

env-check:
	bash scripts/check-env.sh

shell-back:
	docker exec -it quiz_backend sh

shell-front:
	docker exec -it quiz_frontend sh

shell-db:
	docker exec -it quiz_db sh -lc 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

# **************************************************************************** #
#                                    GIT                                       #
# **************************************************************************** #

branch:
	@echo $(BRANCH)

status:
	git status

pull-dev:
	@branch=$$(git branch --show-current); \
	if [ -z "$$branch" ]; then \
		echo "❌ Impossible de détecter la branche courante"; \
		exit 1; \
	fi; \
	if ! git diff --quiet || ! git diff --cached --quiet; then \
		echo "❌ Working tree non clean. Commit ou stash tes changements avant d'utiliser pull-dev."; \
		exit 1; \
	fi; \
	echo "📦 Branche actuelle: $$branch"; \
	git checkout dev || exit 1; \
	git pull --ff-only origin dev || exit 1; \
	if [ "$$branch" = "dev" ]; then \
		echo "✅ Branche dev mise à jour"; \
		exit 0; \
	fi; \
	git checkout "$$branch" || exit 1; \
	echo "🔄 Merge de dev dans $$branch"; \
	git merge dev

pull-branch:
	@if [ -z "$(name)" ]; then \
		echo "❌ Usage: make pull-branch name=issue_1/feature/ma-branche"; \
		exit 1; \
	fi; \
	current=$$(git branch --show-current); \
	if [ -z "$$current" ]; then \
		echo "❌ Impossible de détecter la branche courante"; \
		exit 1; \
	fi; \
	if ! git diff --quiet || ! git diff --cached --quiet; then \
		echo "❌ Working tree non clean. Commit ou stash tes changements avant d'utiliser pull-branch."; \
		exit 1; \
	fi; \
	echo "📦 Branche actuelle: $$current"; \
	echo "🎯 Branche source: $(name)"; \
	git checkout "$(name)" || exit 1; \
	git pull --ff-only origin "$(name)" || exit 1; \
	if [ "$$current" = "$(name)" ]; then \
		echo "✅ Branche $(name) mise à jour"; \
		exit 0; \
	fi; \
	git checkout "$$current" || exit 1; \
	echo "🔄 Merge de $(name) dans $$current"; \
	git merge "$(name)"

merge-dev:
	@branch=$$(git branch --show-current); \
	if [ -z "$$branch" ]; then \
		echo "❌ Impossible de détecter la branche courante"; \
		exit 1; \
	fi; \
	if [ "$$branch" = "main" ] || [ "$$branch" = "dev" ]; then \
		echo "❌ Cette commande est faite pour merger une branche feature/fix/chore vers dev"; \
		exit 1; \
	fi; \
	if ! git diff --quiet || ! git diff --cached --quiet; then \
		echo "❌ Working tree non clean. Commit ou stash tes changements avant le merge."; \
		exit 1; \
	fi; \
	echo "📦 Branche source: $$branch"; \
	git checkout dev || exit 1; \
	git pull origin dev || exit 1; \
	git merge --no-ff "$$branch" || exit 1

branch-create:
	@if [ -z "$(name)" ]; then \
		echo "❌ Usage: make branch-create name=issue_1/feature/ma-branche"; \
		exit 1; \
	fi; \
	current=$$(git branch --show-current); \
	if [ "$$current" != "dev" ]; then \
		echo "⚠️ Tu n'es pas sur dev (actuel: $$current)"; \
		echo "➡️ Switch automatique vers dev"; \
		git checkout dev || exit 1; \
	fi; \
	git pull origin dev || exit 1; \
	git checkout -b $(name)

branch-create-push:
	@if [ -z "$(name)" ]; then \
		echo "❌ Usage: make branch-create-push name=issue_1/feature/ma-branche"; \
		exit 1; \
	fi; \
	current=$$(git branch --show-current); \
	if [ "$$current" != "dev" ]; then \
		echo "⚠️ Tu n'es pas sur dev (actuel: $$current)"; \
		echo "➡️ Switch automatique vers dev"; \
		git checkout dev || exit 1; \
	fi; \
	git pull origin dev || exit 1; \
	git checkout -b $(name) || exit 1; \
	git push -u origin $(name)

duplicate_branch:
	@if [ -z "$(name)" ]; then \
		echo "❌ Usage: make duplicate_branch name=issue_1/copy/ma-branche"; \
		exit 1; \
	fi; \
	case "$(name)" in \
		issue_*/copy/*) ;; \
		*) \
			echo "❌ Le nom doit respecter le format issue_X/copy/..."; \
			exit 1; \
			;; \
	esac; \
	current=$$(git branch --show-current); \
	if [ -z "$$current" ]; then \
		echo "❌ Impossible de détecter la branche courante"; \
		exit 1; \
	fi; \
	if git show-ref --verify --quiet refs/heads/$(name); then \
		echo "❌ La branche $(name) existe déjà en local"; \
		exit 1; \
	fi; \
	echo "📦 Branche source: $$current"; \
	echo "🪄 Nouvelle branche: $(name)"; \
	git checkout -b $(name)

push:
	@branch=$$(git branch --show-current); \
	if [ -z "$$branch" ]; then \
		echo "❌ Impossible de détecter la branche courante"; \
		exit 1; \
	fi; \
	if [ "$$branch" = "main" ]; then \
		echo "❌ Interdit de push sur main directement"; \
		exit 1; \
	fi; \
	if [ "$$branch" = "dev" ]; then \
		echo "❌ Interdit de push directement sur dev"; \
		exit 1; \
	fi; \
	if [ -z "$(m)" ]; then \
		echo "❌ Usage: make push m=\"message\""; \
		exit 1; \
	fi; \
	git add .; \
	if git diff --cached --quiet; then \
		echo "⚠️ Aucun changement à commit"; \
		exit 1; \
	fi; \
	git commit -m "$(m)" || exit 1; \
	git push origin $$branch

push-dev:
	@branch=$$(git branch --show-current); \
	if [ -z "$$branch" ]; then \
		echo "❌ Impossible de détecter la branche courante"; \
		exit 1; \
	fi; \
	if [ "$$branch" != "dev" ]; then \
		echo "❌ Cette commande push uniquement la branche dev (actuelle: $$branch)"; \
		exit 1; \
	fi; \
	if [ -z "$(m)" ]; then \
		echo "❌ Usage: make push-dev m=\"message\""; \
		exit 1; \
	fi; \
	git add .; \
	if git diff --cached --quiet; then \
		echo "⚠️ Aucun changement à commit"; \
		exit 1; \
	fi; \
	git commit -m "$(m)" || exit 1; \
	git push origin dev

rebase-dev:
	@branch=$$(git branch --show-current); \
	if [ "$$branch" = "main" ] || [ "$$branch" = "dev" ]; then \
		echo "❌ Cette commande est faite pour une branche feature/fix/chore"; \
		exit 1; \
	fi; \
	git fetch origin || exit 1; \
	git rebase origin/dev

push-file-dev:
	@if [ -z "$(file)" ]; then \
		echo "❌ Usage: make push-file-dev file=Makefile"; \
		exit 1; \
	fi; \
	current=$$(git branch --show-current); \
	echo "📦 Branche actuelle: $$current"; \
	echo "📄 Fichier: $(file)"; \
	git fetch origin || exit 1; \
	git checkout dev || exit 1; \
	git pull origin dev || exit 1; \
	git checkout $$current -- $(file) || exit 1; \
	git add $(file); \
	git commit -m "chore: update $(file) from $$current" || exit 1; \
	git push origin dev; \
	git checkout $$current

# **************************************************************************** #
#                                   PHONY                                      #
# **************************************************************************** #

.PHONY: help \
	all \
	compose-check \
	up down clean fclean re restart logs logs-back logs-front logs-db page ps test-stack smoke-test \
	shell-back shell-front shell-db \
	push push-dev branch branch-create branch-create-push duplicate_branch status pull-dev pull-branch merge-dev rebase-dev push-file-dev
