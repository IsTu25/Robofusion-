demo-reset:
	docker compose exec db psql -U robofusion -d robofusion -c "\
	TRUNCATE events, acknowledgments, readings, incidents, predictions RESTART IDENTITY CASCADE; \
	UPDATE zone_hazard_state SET debounce_fire_count=0, last_fire_high_at=NULL, \
	  fire_decay_value=0.0, pir_last_true_at=NULL, pir_confirmed=false, last_risk_score=0.0; \
	UPDATE zones SET status='SAFE', override_until=NULL, last_reading_at=NULL;"

backup:
	docker compose exec db pg_dump -U robofusion robofusion > ./backups/robofusion_$$(date +%F_%H%M).sql

restore:
	docker compose exec -T db psql -U robofusion robofusion < ./backups/$(FILE)

load-test:
	source backend/.venv/bin/activate && python scripts/load_test.py

seed-data:
	source backend/.venv/bin/activate && python scripts/seed_data.py
