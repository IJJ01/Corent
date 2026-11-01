#!/bin/sh
set -e
# Django services have a manage.py: apply migrations first (safe to repeat, never resets data).
if [ -f "services/${SERVICE}/manage.py" ]; then
  echo "[entrypoint] applying migrations for ${SERVICE}"
  (cd "services/${SERVICE}" && python manage.py migrate --noinput)
fi
exec python -m "services.${SERVICE}.rpc.server"