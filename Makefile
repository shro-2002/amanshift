# AmanShift — reproducibility commands (doc 06 section 12)
BACKEND := backend
WEB := web
PY := cd $(BACKEND) && PYTHONPATH=. uv run

.PHONY: setup data test test-backend test-web lint eval e2e demo build serve

setup:
	cd $(BACKEND) && uv sync --frozen
	cd $(WEB) && npm ci

data:            ## fetch & cache 2022-2026 summers (IEM: one request per year, 10 s apart)
	$(PY) python -m amanshift.data.fetch

test: test-backend test-web

test-backend:    ## golden + unit + integration + fast property profile (500 cases)
	$(PY) ruff check amanshift amanshift_checker eval tests
	$(PY) mypy amanshift/engine amanshift_checker
	$(PY) env AMANSHIFT_PROP_N=500 pytest -q

test-web:
	cd $(WEB) && npm test --silent

lint:
	$(PY) ruff check amanshift amanshift_checker eval tests

eval:            ## regenerate every number shown anywhere -> eval/out/*.json + report.md
	$(PY) python -m eval.run_all

build:
	cd $(WEB) && npm run build

serve: build     ## local API + built PWA on http://localhost:8080
	$(PY) uvicorn amanshift.api.app:app --host 0.0.0.0 --port 8080

e2e:             ## playwright against the local container/server
	cd $(WEB) && AMANSHIFT_URL=$(or $(AMANSHIFT_URL),http://localhost:8080) npx playwright test

demo:            ## docker compose up -> http://localhost:8080 (works offline from cached data)
	docker compose up --build
