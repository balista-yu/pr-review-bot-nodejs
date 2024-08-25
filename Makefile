help: ## Show this help
	@printf "\033[33m%s:\033[0m\n" 'Available commands'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_-]+:.*?## / {printf "  \033[32m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
up: ## Start the container
	docker compose up -d
build: ## Build the container
	docker compose build --no-cache --force-rm
stop: ## Stop the container
	docker compose stop
down: ## Down the container
	docker compose down --remove-orphans
down-v: ## Down the container and volumes
	docker compose down --remove-orphans --volumes
destroy: ## Destroy the container
	docker compose down --rmi all --volumes --remove-orphans
ps: ## ps
	docker compose ps
logs: ## Show the logs
	docker compose logs
logs-watch: ## Watch the logs
	docker compose logs --follow
init: ## Init the container
	docker compose up -d --build
	docker compose exec bot-app npm install
build-app: ## Build Bot App
	docker compose exec bot-app npm run build
run-app: ## Run Bot App
	docker compose exec bot-app npm run start
run-test: ## Run Test
	docker compose exec bot-app npm run test
