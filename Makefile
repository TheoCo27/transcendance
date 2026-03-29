# **************************************************************************** #
#                                    CONFIG                                    #
# **************************************************************************** #

COMPOSE = docker compose
BRANCH := $(shell git branch --show-current 2>/dev/null)

# **************************************************************************** #
#                                    HELP                                      #
# **************************************************************************** #

help:
	@echo "Usage:"
	@echo "  make up                  -> Build and start all containers"
	@echo "  make down                -> Stop containers"
	@echo "  make clean               -> Stop containers and remove volumes"
	@echo "  make fclean              -> Full clean: containers, volumes, images"
	@echo "  make restart             -> Restart all containers with rebuild"
	@echo "  make logs                -> Follow all docker logs"
	@echo "  make logs-back           -> Follow backend logs"
	@echo "  make logs-front          -> Follow frontend logs"
	@echo "  make logs-db             -> Follow database logs"
	@echo "  make ps                  -> Show running containers"
	@echo "  make shell-back          -> Open shell in backend container"
	@echo "  make shell-front         -> Open shell in frontend container"
	@echo "  make shell-db            -> Open shell in db container"
	@echo "  make branch              -> Show current git branch"
	@echo "  make branch-create name=feature/xxx"
	@echo "                           -> Create a branch from dev"
	@echo "  make branch-create-push name=feature/xxx"
	@echo "                           -> Create and push a branch from dev"
	@echo "  make push m=\"your message\""
	@echo "                           -> Add, commit and push current branch"
	@echo "  make status              -> Git status"
	@echo "  make pull-dev            -> Update local dev branch"
	@echo "  make rebase-dev          -> Rebase current branch onto dev"
	@echo "  make push-file-dev file=Makefile     -> Push one file to dev branch"

# **************************************************************************** #
#                                  DOCKER                                      #
# **************************************************************************** #

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

clean:
	$(COMPOSE) down -v

fclean:
	$(COMPOSE) down -v --rmi all

restart:
	$(COMPOSE) down && $(COMPOSE) up --build

logs:
	$(COMPOSE) logs -f

logs-back:
	$(COMPOSE) logs -f backend

logs-front:
	$(COMPOSE) logs -f frontend

logs-db:
	$(COMPOSE) logs -f db

ps:
	$(COMPOSE) ps

shell-back:
	docker exec -it quiz_backend sh

shell-front:
	docker exec -it quiz_frontend sh

shell-db:
	docker exec -it quiz_db sh

# **************************************************************************** #
#                                    GIT                                       #
# **************************************************************************** #

branch:
	@echo $(BRANCH)

status:
	git status

pull-dev:
	git checkout dev && git pull origin dev

branch-create:
	@if [ -z "$(name)" ]; then \
		echo "❌ Usage: make branch-create name=feature/ma-branche"; \
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
		echo "❌ Usage: make branch-create-push name=feature/ma-branche"; \
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
	up down clean fclean restart logs logs-back logs-front logs-db ps \
	shell-back shell-front shell-db \
	push branch branch-create branch-create-push status pull-dev rebase-dev