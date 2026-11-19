# AmanShift — single image: FastAPI serves /api and the built PWA. No secrets needed.
FROM node:22-slim AS web
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npx vite build

FROM python:3.12-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 \
    AMANSHIFT_DB=/data/amanshift.sqlite PYTHONPATH=/app/backend
COPY --from=ghcr.io/astral-sh/uv:0.11.21 /uv /usr/local/bin/uv
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/amanshift ./amanshift
COPY backend/amanshift_checker ./amanshift_checker
COPY policy /app/policy
COPY data /app/data
COPY eval/out /app/eval/out
COPY --from=web /app/web/dist /app/web/dist
RUN useradd --create-home --uid 10001 amanshift && mkdir -p /data && chown amanshift /data
USER amanshift
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8080/api/v1/health')"
CMD ["/app/backend/.venv/bin/uvicorn", "amanshift.api.app:app", "--host", "0.0.0.0", "--port", "8080"]
