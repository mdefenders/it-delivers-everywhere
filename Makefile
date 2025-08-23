# From https://gist.github.com/mpneuried/0594963ad38e68917ef189b4e6a269db

# HELP
# This will output the help for each task
# thanks to https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
.PHONY: help

help: ## This help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.DEFAULT_GOAL := help

# Actions tasks

install: ## Install dependencies
	npm install
test-unit: ## Run the tests
	mkdir -p coverage && npm run test:unit -- --coverage | tee coverage/output.txt
test-integration: ## Run the integration tests
	mkdir -p coverage && npm run test:integration -- --coverage | tee coverage/output.txt
test-endtoend: ## Run the integration tests
	mkdir -p coverage && npm run test:endtoend -- --coverage | tee coverage/output.txt
test-smoke: ## Run the integration tests
	mkdir -p coverage && npm run test:smoke -- --coverage | tee coverage/output.txt