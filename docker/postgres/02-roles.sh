#!/bin/bash
# Runs once, on first initialisation of an empty data volume (after 01-databases.sql).
# Creates one login role per service, allowed to connect only to its own database.
set -euo pipefail

create_role() {  # $1=role  $2=password  $3=database
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    CREATE ROLE $1 LOGIN PASSWORD '$2';
    REVOKE ALL ON DATABASE $3 FROM PUBLIC;
    GRANT CONNECT ON DATABASE $3 TO $1;
    ALTER DATABASE $3 OWNER TO $1;
EOSQL
}

create_role user_service_role         "$USER_DB_PASSWORD"  users_service_db
create_role house_service_role        "$HOUSE_DB_PASSWORD" house_service_db
create_role application_service_role  "$APP_DB_PASSWORD"   app_service_db
create_role admin_service_role        "$ADMIN_DB_PASSWORD" admin_service_db
create_role notification_service_role "$NOTIF_DB_PASSWORD" notification_service_db