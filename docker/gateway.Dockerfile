FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app:/app/gateway

WORKDIR /app

COPY gateway/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

COPY shared ./shared
COPY gateway ./gateway

RUN useradd --system --uid 10001 app && chown -R app /app
USER app

WORKDIR /app/gateway
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]