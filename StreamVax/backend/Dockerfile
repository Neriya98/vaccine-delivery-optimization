FROM python:3.11-slim

WORKDIR /app

# Dépendances système pour psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

ENV FLASK_APP=run.py
ENV FLASK_ENV=development
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 5000

CMD ["flask", "run", "--host=0.0.0.0"]
