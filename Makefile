.PHONY: $(shell egrep -o '^(\._)?[a-z_-]+:' $(MAKEFILE_LIST) | sed 's/://')

help: ## Show options
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-10s\033[0m %s\n", $$1, $$2}'

run: ## Run
	pnpm start
