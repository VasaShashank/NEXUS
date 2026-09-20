FROM python:3.11-slim

WORKDIR /app

# System deps needed by pandas/numpy wheels and bcrypt build fallback
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Persistent volume mount point for SQLite when Postgres isn't configured.
# In production, set DATABASE_URL to a real Postgres instance instead —
# see DEPLOYMENT_DECISIONS.md.
RUN mkdir -p /data && mkdir -p /app/.cache && chown -R 10001:10001 /data && chown -R 10001:10001 /app/.cache
ENV DATABASE_URL=sqlite:////data/nexus.db

# The unprivileged runtime user. NOTE: we deliberately do NOT `USER nexususer`
# here — docker-entrypoint.py must start as root so it can chown the named
# volume at /data (which is root-owned at mount time), then it drops to
# nexususer (UID 10001) before execing the real command.
RUN useradd --uid 10001 --create-home nexususer

EXPOSE 8000

ENTRYPOINT ["python", "/app/docker-entrypoint.py"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
