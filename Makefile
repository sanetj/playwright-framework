.PHONY: juice-up juice-reset juice-seed

juice-up:
	docker-compose -f docker/juice-shop/docker-compose.yml up -d

juice-reset:
	docker-compose -f docker/juice-shop/docker-compose.yml down -v
	docker-compose -f docker/juice-shop/docker-compose.yml up -d

juice-seed:
	# Add curl or other commands here if specific seed data needs to be populated via API.
	@echo "Juice Shop started. It self-seeds most challenges on startup."
