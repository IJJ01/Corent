FROM python:3.12-slim

ARG SERVICE
ENV SERVICE=${SERVICE} \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first, so this layer is cached until requirements.txt changes
COPY services/${SERVICE}/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

COPY shared ./shared
COPY services/${SERVICE} ./services/${SERVICE}
COPY docker/service-entrypoint.sh /usr/local/bin/service-entrypoint.sh

RUN chmod +x /usr/local/bin/service-entrypoint.sh \
    && useradd --system --uid 10001 app \
    && chown -R app /app
USER app

ENTRYPOINT ["/usr/local/bin/service-entrypoint.sh"]